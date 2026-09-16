// Edge Function acionada por um usuário logado no app (JWT normal do Supabase, verify_jwt=true —
// diferente de send-notifications, que é acionada pelo cron via segredo próprio). Propósito
// único: falar com a API do Zoom, nunca escreve no banco — quem cria o evento na Agenda é o
// cliente, reaproveitando createEvent() que já existe. Credenciais do Zoom (Server-to-Server
// OAuth, feito pra apps de conta única — sem redirecionamento/consentimento por usuário) ficam em
// app_secrets, mesmo padrão das chaves VAPID e do segredo do cron.
//
// Primeira função chamada direto do navegador (`supabase.functions.invoke`) — diferente de
// send-notifications, que só é chamada servidor-a-servidor pelo pg_cron. Por isso precisa de
// cabeçalhos CORS e responder ao preflight OPTIONS; sem isso o navegador bloqueia a chamada antes
// mesmo dela chegar na função ("Failed to send a request to the Edge Function").
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

  let body: { title?: string; startAt?: string; endAt?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo inválido." }, 400);
  }
  const { title, startAt, endAt } = body;
  if (!title || !startAt || !endAt) {
    return jsonResponse({ error: "title, startAt e endAt são obrigatórios." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: secretRows, error: secretsError } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["zoom_account_id", "zoom_client_id", "zoom_client_secret"]);
  if (secretsError || !secretRows || secretRows.length < 3) {
    return jsonResponse({ error: "Credenciais do Zoom não configuradas." }, 500);
  }
  const secrets = Object.fromEntries(secretRows.map((r) => [r.key, r.value]));

  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${secrets.zoom_account_id}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${secrets.zoom_client_id}:${secrets.zoom_client_secret}`)}`,
      },
    },
  );
  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text();
    console.error("Zoom token error", tokenResponse.status, detail);
    return jsonResponse({ error: `Falha ao autenticar com o Zoom: ${detail}` }, 502);
  }
  const { access_token: accessToken } = await tokenResponse.json();

  const durationMinutes = Math.max(1, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000));

  const meetingResponse = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: title,
      type: 2,
      start_time: startAt,
      duration: durationMinutes,
      timezone: "UTC",
      settings: { join_before_host: true },
    }),
  });
  if (!meetingResponse.ok) {
    const detail = await meetingResponse.text();
    console.error("Zoom meeting error", meetingResponse.status, detail);
    return jsonResponse({ error: `Falha ao criar a reunião no Zoom: ${detail}` }, 502);
  }
  const meeting = await meetingResponse.json();

  return jsonResponse({ joinUrl: meeting.join_url, startAt, endAt });
});
