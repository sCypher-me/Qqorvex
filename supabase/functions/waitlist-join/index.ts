// Edge Function pública (verify_jwt=false) do formulário de lista de espera do site de
// apresentação. Sem login, a proteção é: origem permitida, campo-armadilha, Turnstile conferido
// aqui no servidor (a chave secreta fica em app_secrets) e no máximo 5 tentativas por IP por hora
// (`waitlist_register`, que guarda o IP só como hash). A resposta é a mesma para e-mail novo ou
// repetido, então ninguém descobre quem já está na lista.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?qqorvex\.pages\.dev$/;
const DEV_ORIGINS = new Set(["http://localhost:5180", "http://127.0.0.1:5180"]);
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 10_000;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "",
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

async function hmacHex(key: string, value: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: secretRows } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["turnstile_secret_key", "site_base_url"]);
  const secrets = Object.fromEntries((secretRows ?? []).map((row) => [row.key, row.value]));

  const requestOrigin = req.headers.get("origin");
  const allowed = requestOrigin !== null && (SITE_ORIGIN.test(requestOrigin) || DEV_ORIGINS.has(requestOrigin) || requestOrigin === secrets.site_base_url);
  const headers = corsHeaders(allowed ? requestOrigin : null);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!allowed) return json({ error: "Origem não permitida." }, 403);

  let body: { email?: unknown; turnstileToken?: unknown; website?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido." }, 400);
  }
  // Campo-armadilha: invisível para pessoas; robôs costumam preencher. Finge sucesso.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken.slice(0, 2048) : "";
  if (!email || !token) return json({ error: "Informe o e-mail e confirme que você não é um robô." }, 400);

  const turnstileSecret = secrets.turnstile_secret_key;
  if (!turnstileSecret) return json({ error: "A lista de espera ainda não está aberta." }, 503);

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let human = false;
  try {
    const verification = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
      signal: controller.signal,
    });
    human = verification.ok && (await verification.json()).success === true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return json({ error: "Não conseguimos confirmar agora. Tente de novo em instantes." }, 503);
  } finally {
    clearTimeout(timeout);
  }
  if (!human) return json({ error: "Não conseguimos confirmar que você não é um robô. Tente de novo." }, 400);

  const source = typeof body.source === "string" && /^[a-z0-9-]{1,40}$/.test(body.source) ? body.source : "site";
  const { data: outcome, error } = await supabase.rpc("waitlist_register", {
    p_email: email,
    p_ip_hash: await hmacHex(turnstileSecret, ip),
    p_source: source,
  });
  if (error) {
    console.error("waitlist_register failed", error);
    return json({ error: "Não foi possível entrar na lista agora. Tente de novo em instantes." }, 500);
  }
  if (outcome === "rate_limited") return json({ error: "Muitas tentativas. Tente de novo mais tarde." }, 429);
  if (outcome === "invalid") return json({ error: "Confira o e-mail digitado." }, 400);
  return json({ ok: true });
});
