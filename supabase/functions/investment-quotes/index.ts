import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_POSITIONS = 30;
const REQUEST_TIMEOUT_MS = 8_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
// Permite a carga inicial e uma recuperação automática do feed sem bloquear o usuário
// após dois pedidos; a janela curta ainda protege o provedor de atualizações em loop.
const MAX_REQUESTS_PER_WINDOW = 8;
const MARKET_CACHE_TTL_MS = 2 * 60_000;
const CRYPTO_MARKET_SYMBOLS = "BTC,ETH,BNB,SOL,XRP,DOGE,ADA";
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

type Position = { id: string; asset_type: "crypto" | "stock" | "fii"; symbol: string };
type Quote = {
  positionId: string;
  assetType: Position["asset_type"];
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  changePercent: number | null;
  asOf: string | null;
  error: string | null;
};
type MarketAsset = {
  assetType: "stock" | "fii" | "crypto";
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  asOf: string | null;
};
type MarketMovers = { gainers: MarketAsset[]; decliners: MarketAsset[] };
type MarketSnapshot = {
  stocks: MarketMovers;
  fiis: MarketMovers;
  crypto: MarketAsset[];
  updatedAt: string;
};
type MarketLoadResult = { snapshot: MarketSnapshot; warning: string | null };
type BrapiListAsset = { stock?: string; name?: string; close?: unknown; change?: unknown };

class BrapiRequestError extends Error {
  constructor(readonly status: number) {
    super(`brapi returned ${status}`);
    this.name = "BrapiRequestError";
  }
}

let cachedMarketSnapshot: { value: MarketLoadResult; expiresAt: number } | null = null;
let pendingMarketRequest: Promise<MarketLoadResult> | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

async function timedFetch(url: string, apiKey: string, signal: AbortSignal) {
  return fetch(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, signal });
}

function normalizeBrapiApiKey(value: unknown): string {
  if (typeof value !== "string") return "";
  let key = value.trim().replace(/^Bearer\s+/i, "").trim();
  if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchBrapiJSON(url: string, apiKey: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await timedFetch(url, apiKey, controller.signal);
      if (!response.ok) {
        const error = new BrapiRequestError(response.status);
        const transient = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        if (transient && attempt === 0) {
          await pause(350);
          continue;
        }
        throw error;
      }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("brapi returned an invalid response");
      return body as Record<string, unknown>;
    } catch (error) {
      if (attempt === 0 && !(error instanceof BrapiRequestError && error.status < 500 && error.status !== 408 && error.status !== 425 && error.status !== 429)) {
        await pause(350);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("brapi request failed");
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMarketAssets(rows: unknown, assetType: MarketAsset["assetType"]): MarketAsset[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row): MarketAsset[] => {
    if (!row || typeof row !== "object") return [];
    const asset = row as BrapiListAsset;
    if (typeof asset.stock !== "string" || !asset.stock.trim()) return [];
    return [{
      assetType,
      symbol: asset.stock.toUpperCase(),
      name: asset.name?.trim() || asset.stock.toUpperCase(),
      price: numeric(asset.close),
      changePercent: numeric(asset.change),
      asOf: null,
    }];
  });
}

async function fetchMarketList(apiKey: string, asset: "stock" | "fii", sortOrder: "asc" | "desc"): Promise<MarketAsset[]> {
  const params = new URLSearchParams({ sortBy: "change", sortOrder, limit: "5" });
  if (asset === "stock") params.set("type", "stock");
  else {
    params.set("type", "fund");
    params.set("subType", "fii");
  }
  const data = await fetchBrapiJSON(`https://brapi.dev/api/quote/list?${params.toString()}`, apiKey);
  return parseMarketAssets(data.stocks, asset).filter((item) => {
    const change = item.changePercent ?? 0;
    return sortOrder === "desc" ? change > 0 : change < 0;
  });
}

async function loadMarketSnapshot(apiKey: string): Promise<MarketLoadResult> {
  if (cachedMarketSnapshot && cachedMarketSnapshot.expiresAt > Date.now()) return cachedMarketSnapshot.value;
  if (pendingMarketRequest) return pendingMarketRequest;

  const request = (async (): Promise<MarketLoadResult> => {
    const cryptoUrl = new URL("https://brapi.dev/api/v2/crypto");
    cryptoUrl.searchParams.set("coin", CRYPTO_MARKET_SYMBOLS);
    cryptoUrl.searchParams.set("currency", "BRL");
    const [stockGainersResult, stockDeclinersResult, fiiGainersResult, fiiDeclinersResult, cryptoResult] = await Promise.allSettled([
      fetchMarketList(apiKey, "stock", "desc"),
      fetchMarketList(apiKey, "stock", "asc"),
      fetchMarketList(apiKey, "fii", "desc"),
      fetchMarketList(apiKey, "fii", "asc"),
      fetchBrapiJSON(cryptoUrl.toString(), apiKey),
    ]);
    const feeds = [
      { name: "ações", result: stockGainersResult },
      { name: "ações", result: stockDeclinersResult },
      { name: "FIIs", result: fiiGainersResult },
      { name: "FIIs", result: fiiDeclinersResult },
      { name: "criptomoedas", result: cryptoResult },
    ] as const;
    const failedFeeds = feeds.filter((feed) => feed.result.status === "rejected");
    if (failedFeeds.length === feeds.length) {
      const failures = failedFeeds.map((feed) => feed.result.status === "rejected" ? feed.result.reason : null);
      if (failures.some((error) => error instanceof BrapiRequestError && (error.status === 401 || error.status === 403))) {
        throw new Error("A brapi.dev negou acesso aos dados. Confira se a chave está ativa e se o plano permite consultar estes endpoints em Central do Dono → Integrações.");
      }
      if (failures.some((error) => error instanceof BrapiRequestError && error.status === 429)) {
        throw new Error("A brapi.dev limitou temporariamente as cotações. Aguarde um pouco e tente de novo.");
      }
      throw new Error("Não foi possível receber cotações da brapi.dev agora. O app vai tentar novamente automaticamente.");
    }
    const stockGainers = stockGainersResult.status === "fulfilled" ? stockGainersResult.value : [];
    const stockDecliners = stockDeclinersResult.status === "fulfilled" ? stockDeclinersResult.value : [];
    const fiiGainers = fiiGainersResult.status === "fulfilled" ? fiiGainersResult.value : [];
    const fiiDecliners = fiiDeclinersResult.status === "fulfilled" ? fiiDeclinersResult.value : [];
    const cryptoData = cryptoResult.status === "fulfilled" ? cryptoResult.value : {};
    const coins = Array.isArray(cryptoData.coins) ? cryptoData.coins : [];
    const crypto = coins.flatMap((value): MarketAsset[] => {
      if (!value || typeof value !== "object") return [];
      const coin = value as Record<string, unknown>;
      if (typeof coin.coin !== "string" || !coin.coin.trim()) return [];
      return [{
        assetType: "crypto",
        symbol: coin.coin.toUpperCase(),
        name: typeof coin.coinName === "string" ? coin.coinName : coin.coin.toUpperCase(),
        price: numeric(coin.regularMarketPrice),
        changePercent: numeric(coin.regularMarketChangePercent),
        asOf: typeof coin.regularMarketTime === "string" ? coin.regularMarketTime : null,
      }];
    });
    const snapshot: MarketSnapshot = {
      stocks: { gainers: stockGainers, decliners: stockDecliners },
      fiis: { gainers: fiiGainers, decliners: fiiDecliners },
      crypto,
      updatedAt: new Date().toISOString(),
    };
    const warningByFeed = [...new Set(failedFeeds.map((feed) => feed.name))];
    if (cryptoResult.status === "fulfilled" && crypto.length === 0) warningByFeed.push("criptomoedas");
    const deniedFeeds = [...new Set(feeds
      .filter((feed) => feed.result.status === "rejected" && feed.result.reason instanceof BrapiRequestError && (feed.result.reason.status === 401 || feed.result.reason.status === 403))
      .map((feed) => feed.name))];
    const warning = deniedFeeds.length
      ? `A brapi.dev negou acesso a ${deniedFeeds.join(", ")}. Confira se a chave está ativa e se o plano permite consultar esses dados em Central do Dono → Integrações.`
      : warningByFeed.length
        ? `Algumas cotações estão indisponíveis: ${[...new Set(warningByFeed)].join(", ")}. O restante do mercado continua disponível.`
        : null;
    const loaded = { snapshot, warning };
    // Não segurar resultados incompletos no cache: a segunda tentativa automática precisa
    // poder buscar de novo justamente o feed que falhou (muito comum em cripto).
    if (!warning) cachedMarketSnapshot = { value: loaded, expiresAt: Date.now() + MARKET_CACHE_TTL_MS };
    return loaded;
  })();

  pendingMarketRequest = request;
  try {
    return await request;
  } finally {
    if (pendingMarketRequest === request) pendingMarketRequest = null;
  }
}

function consumeRateLimit(userId: string): boolean {
  const now = Date.now();
  if (requestBuckets.size > 1_000) {
    for (const [id, bucket] of requestBuckets) if (now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) requestBuckets.delete(id);
  }
  const current = requestBuckets.get(userId);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length > 4_096) return json({ error: "Entre na sua conta para consultar a carteira." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sessão inválida. Entre novamente." }, 401);
  if (!consumeRateLimit(authData.user.id)) return json({ error: "Você atualizou as cotações muitas vezes. Aguarde um minuto." }, 429);

  const [{ data: positionRows, error: positionError }, { data: secretRow, error: secretError }] = await Promise.all([
    supabase.from("investment_positions").select("id, asset_type, symbol").eq("user_id", authData.user.id).order("symbol").limit(MAX_POSITIONS),
    supabase.from("app_secrets").select("value").eq("key", "brapi_api_key").maybeSingle(),
  ]);
  if (positionError) return json({ error: "Não foi possível carregar os ativos da carteira." }, 500);
  if (secretError) return json({ error: "Não foi possível consultar a configuração do provedor de cotações." }, 500);

  const apiKey = normalizeBrapiApiKey(secretRow?.value);
  const positions = (positionRows ?? []) as Position[];
  const marketPromise = loadMarketSnapshot(apiKey);
  const quotes: Quote[] = [];
  for (let start = 0; start < positions.length; start += 5) {
    const batch = positions.slice(start, start + 5);
    const batchQuotes = await Promise.all(batch.map(async (position): Promise<Quote> => {
      const fallback: Quote = {
        positionId: position.id,
        assetType: position.asset_type,
        symbol: position.symbol,
        name: position.symbol,
        currency: "BRL",
        price: null,
        changePercent: null,
        asOf: null,
        error: null,
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const crypto = position.asset_type === "crypto";
        const url = crypto
          ? `https://brapi.dev/api/v2/crypto?coin=${encodeURIComponent(position.symbol)}&currency=BRL`
          : `https://brapi.dev/api/quote/${encodeURIComponent(position.symbol)}`;
        const response = await timedFetch(url, apiKey, controller.signal);
        if (!response.ok) {
          const needsKey = !apiKey && (response.status === 401 || response.status === 403);
          return { ...fallback, error: needsKey ? "Configure a chave gratuita da brapi.dev em Central do Dono → Integrações para habilitar este ativo." : response.status === 404 ? "Ativo não encontrado." : "Cotação temporariamente indisponível." };
        }
        const data = await response.json();
        const market = crypto ? data.coins?.[0] : data.results?.[0];
        if (!market) return { ...fallback, error: "O provedor não encontrou este ativo." };
        return {
          ...fallback,
          name: market.coinName ?? market.shortName ?? market.longName ?? position.symbol,
          currency: market.currency ?? "BRL",
          price: numeric(market.regularMarketPrice),
          changePercent: numeric(market.regularMarketChangePercent),
          asOf: market.regularMarketTime ?? null,
        };
      } catch (error) {
        return { ...fallback, error: error instanceof DOMException && error.name === "AbortError" ? "A cotação demorou demais. Tente atualizar novamente." : "Falha de conexão ao buscar a cotação." };
      } finally {
        clearTimeout(timeout);
      }
    }));
    quotes.push(...batchQuotes);
  }

  let market: MarketSnapshot | null = null;
  let marketError: string | null = null;
  try {
    const loadedMarket = await marketPromise;
    market = loadedMarket.snapshot;
    marketError = loadedMarket.warning;
  } catch (error) {
    marketError = error instanceof Error ? error.message : "Não foi possível carregar o mercado agora. Tente novamente em instantes.";
  }

  return json({ quotes, market, marketError, apiKeyConfigured: Boolean(apiKey), requestedAt: new Date().toISOString() });
});
