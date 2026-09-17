// Edge Function que dá à Vex a capacidade de buscar na internet — chamada pela ferramenta
// `search_web` (packages/vex/src/tools/webTools.ts). Mesmo padrão de segredo em `app_secrets` e
// CORS de `create-zoom-meeting`/`vex-chat`: a chave da Tavily nunca vai pro bundle do navegador.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo inválido." }, 400);
  }
  const query = (body.query ?? "").trim();
  if (!query) return jsonResponse({ error: "query é obrigatório." }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: secretRows, error: secretsError } = await supabase
    .from("app_secrets")
    .select("key, value")
    .eq("key", "tavily_api_key");
  if (secretsError) return jsonResponse({ error: "Falha ao ler configuração da busca." }, 500);
  const apiKey = secretRows?.[0]?.value;
  if (!apiKey) return jsonResponse({ error: "tavily_api_key não configurada em app_secrets." }, 500);

  const tavilyResponse = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, max_results: 5, include_answer: true }),
  });

  if (!tavilyResponse.ok) {
    const detail = await tavilyResponse.text();
    console.error("Tavily error", tavilyResponse.status, detail);
    return jsonResponse({ error: `Busca falhou (${tavilyResponse.status}): ${detail}` }, 502);
  }

  const data: { answer?: string; results?: Array<{ title: string; url: string; content: string }> } = await tavilyResponse.json();
  return jsonResponse({ answer: data.answer ?? null, results: data.results ?? [] });
});
