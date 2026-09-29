import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(name) {
  return readFile(new URL(`supabase/functions/${name}/index.ts`, root), "utf8");
}

function requirePattern(name, text, pattern, description) {
  assert.match(text, pattern, `${name}: ${description}`);
}

const vexChat = await source("vex-chat");
requirePattern("vex-chat", vexChat, /supabase\.auth\.getUser\(token\)/, "autenticação do bearer token");
requirePattern("vex-chat", vexChat, /MAX_REQUESTS_PER_WINDOW\s*=\s*20/, "limite por usuário");
requirePattern("vex-chat", vexChat, /requestBuckets/, "estado do rate limit");
requirePattern("vex-chat", vexChat, /SERVER_SYSTEM_PROMPT/, "prompt de sistema controlado pelo servidor");
requirePattern("vex-chat", vexChat, /DADOS NÃO CONFIÁVEIS/, "marcação de resultados externos");
requirePattern("vex-chat", vexChat, /<APP_CONTEXT>/, "separação do contexto do aplicativo");
requirePattern("vex-chat", vexChat, /ALLOWED_TOOL_NAMES/, "allow-list de ferramentas");
requirePattern("vex-chat", vexChat, /MAX_TOOL_SCHEMA_CHARS/, "limite de schema recebido");
requirePattern("vex-chat", vexChat, /new AbortController\(\)/, "timeout do provedor");
requirePattern("vex-chat", vexChat, /jsonResponse\(\{ error: "É necessário estar autenticado\." \}, 401\)/, "resposta para sessão inválida");

const vexWebSearch = await source("vex-web-search");
requirePattern("vex-web-search", vexWebSearch, /supabase\.auth\.getUser\(token\)/, "autenticação do bearer token");
requirePattern("vex-web-search", vexWebSearch, /MAX_REQUESTS_PER_WINDOW\s*=\s*10/, "limite por usuário");
requirePattern("vex-web-search", vexWebSearch, /replace\(\/[\\u0000-\\u001F\\u007F]/, "remoção de caracteres de controle");
requirePattern("vex-web-search", vexWebSearch, /\.from\("app_secrets"\)/, "segredo fora do bundle");
requirePattern("vex-web-search", vexWebSearch, /new AbortController\(\)/, "timeout do provedor");

const notifications = await source("send-notifications");
requirePattern("send-notifications", notifications, /x-cron-secret/, "autenticação do cron");
requirePattern("send-notifications", notifications, /\.from\("app_secrets"\)/, "segredo lido do cofre");
requirePattern("send-notifications", notifications, /recurring_task_id/, "idempotência de tarefas recorrentes");
requirePattern("send-notifications", notifications, /recurring_event_id/, "idempotência de eventos recorrentes");
requirePattern("send-notifications", notifications, /ignoreDuplicates:\s*true/, "upsert sem duplicação");
requirePattern("send-notifications", notifications, /\.eq\("user_id", budget\.user_id\)/, "isolamento do orçamento por usuário");
requirePattern("send-notifications", notifications, /\.eq\("next_occurrence_date", occurrenceDate\)/, "compare-and-set da recorrência");

const oauth = await source("google-oauth-callback");
requirePattern("google-oauth-callback", oauth, /google_oauth_states/, "estado OAuth persistido");
requirePattern("google-oauth-callback", oauth, /10 \* 60_000/, "expiração do estado OAuth");
requirePattern("google-oauth-callback", oauth, /\.delete\(\)\.eq\("id", state\)/, "consumo único do estado OAuth");
requirePattern("google-oauth-callback", oauth, /google_client_secret/, "segredo OAuth somente no servidor");

const zoom = await source("create-zoom-meeting");
requirePattern("create-zoom-meeting", zoom, /Date\.parse\(startAt\)/, "validação dos horários");
requirePattern("create-zoom-meeting", zoom, /endTimestamp <= startTimestamp/, "ordem dos horários");
requirePattern("create-zoom-meeting", zoom, /MAX_TITLE_CHARS/, "limite do título");
requirePattern("create-zoom-meeting", zoom, /new AbortController\(\)/, "timeout do Zoom");
requirePattern("create-zoom-meeting", zoom, /\.from\("app_secrets"\)/, "credenciais fora do cliente");

const googleSync = await source("sync-google-calendar");
requirePattern("sync-google-calendar", googleSync, /x-cron-secret/, "autenticação do cron");
requirePattern("sync-google-calendar", googleSync, /refresh_token/, "uso do refresh token no servidor");
requirePattern("sync-google-calendar", googleSync, /google_updated_at/, "controle de concorrência da sincronização");
requirePattern("sync-google-calendar", googleSync, /\.eq\("user_id", connection\.user_id\)/, "isolamento da conexão por usuário");

console.log("edge function security invariants passed");
