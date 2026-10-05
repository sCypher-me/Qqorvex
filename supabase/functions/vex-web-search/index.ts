// Edge Function que dá à Vex a capacidade de buscar na internet — chamada pela ferramenta
// `search_web` (packages/vex/src/tools/webTools.ts). Mesmo padrão de segredo em `app_secrets` e
// CORS de `create-zoom-meeting`/`vex-chat`: a chave da Tavily nunca vai pro bundle do navegador.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { releaseMonthlyQuota, reserveMonthlyQuota } from "../_shared/billing.ts";
import { checkQuerySafety } from "../_shared/vexSafety.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_QUERY_CHARS = 500;
const SEARCH_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 && token.length <= 4_096 ? token : null;
}

async function authenticate(req: Request, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

function consumeRateLimit(userId: string): boolean {
  const now = Date.now();
  if (requestBuckets.size > 1_000) {
    for (const [key, bucket] of requestBuckets) {
      if (now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) requestBuckets.delete(key);
    }
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
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userId = await authenticate(req, supabase);
  if (!userId) return jsonResponse({ error: "É necessário estar autenticado." }, 401);
  if (!consumeRateLimit(userId)) return jsonResponse({ error: "Muitas buscas. Aguarde um minuto e tente novamente." }, 429);

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo inválido." }, 400);
  }
  const query = (body.query ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (!query) return jsonResponse({ error: "query é obrigatório." }, 400);
  if (query.length > MAX_QUERY_CHARS) return jsonResponse({ error: "A busca é longa demais." }, 400);
  const safety = checkQuerySafety(query);
  if (safety.blocked) return jsonResponse({ error: safety.reason, safety: { blocked: true } }, 422);

  const { data: secretRows, error: secretsError } = await supabase
    .from("app_secrets")
    .select("key, value")
    .eq("key", "tavily_api_key");
  if (secretsError) return jsonResponse({ error: "Falha ao ler configuração da busca." }, 500);
  const apiKey = secretRows?.[0]?.value;
  if (!apiKey) return jsonResponse({ error: "tavily_api_key não configurada em app_secrets." }, 500);

  const { quota, error: quotaError } = await reserveMonthlyQuota(supabase, userId, "vex_web_searches");
  if (quotaError || !quota) return jsonResponse({ error: "Não foi possível validar o limite mensal de buscas." }, 503);
  if (!quota.allowed) {
    return jsonResponse({
      error: `Você atingiu o limite de ${quota.limit} buscas na internet neste mês. Conheça o Qqorvex Plus para ampliar esse limite.`,
      quota: { used: quota.used, limit: quota.limit, monthStart: quota.month_start },
    }, 429);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  let tavilyResponse: Response;
  try {
    tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, max_results: 5, include_answer: true }),
      signal: controller.signal,
    });
  } catch (error) {
    console.error("Tavily request failed", error);
    await releaseMonthlyQuota(supabase, userId, "vex_web_searches", quota.month_start);
    return jsonResponse({ error: "A busca externa não respondeu a tempo." }, 504);
  } finally {
    clearTimeout(timeout);
  }

  if (!tavilyResponse.ok) {
    const detail = await tavilyResponse.text();
    console.error("Tavily error", tavilyResponse.status, detail.slice(0, 1_000));
    await releaseMonthlyQuota(supabase, userId, "vex_web_searches", quota.month_start);
    return jsonResponse({ error: "A busca externa está indisponível no momento." }, 502);
  }

  let data: { answer?: string; results?: Array<{ title: string; url: string; content: string }> };
  try {
    data = await tavilyResponse.json();
  } catch {
    await releaseMonthlyQuota(supabase, userId, "vex_web_searches", quota.month_start);
    return jsonResponse({ error: "A busca retornou dados inválidos." }, 502);
  }
  return jsonResponse({ answer: data.answer ?? null, results: data.results ?? [] });
});
