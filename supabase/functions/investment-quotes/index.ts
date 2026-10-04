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
const MAX_REQUESTS_PER_WINDOW = 2;
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

async function timedFetch(url: string, apiKey: string, signal: AbortSignal) {
  return fetch(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, signal });
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const [{ data: positionRows, error: positionError }, { data: secretRow }] = await Promise.all([
    supabase.from("investment_positions").select("id, asset_type, symbol").eq("user_id", authData.user.id).order("symbol").limit(MAX_POSITIONS),
    supabase.from("app_secrets").select("value").eq("key", "brapi_api_key").maybeSingle(),
  ]);
  if (positionError) return json({ error: "Não foi possível carregar os ativos da carteira." }, 500);

  const apiKey = secretRow?.value ?? "";
  const positions = (positionRows ?? []) as Position[];
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

  return json({ quotes, apiKeyConfigured: Boolean(apiKey), requestedAt: new Date().toISOString() });
});
