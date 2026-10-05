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
requirePattern("vex-chat", vexChat, /checkQuerySafety\(latestUserMessage\)/, "bloqueio de mídia sexual explícita antes do modelo");
requirePattern("vex-chat", vexChat, /MAX_TOOL_SCHEMA_CHARS/, "limite de schema recebido");
requirePattern("vex-chat", vexChat, /new AbortController\(\)/, "timeout do provedor");
requirePattern("vex-chat", vexChat, /jsonResponse\(\{ error: "É necessário estar autenticado\." \}, 401\)/, "resposta para sessão inválida");

// Toda ferramenta que o app oferece à Vex precisa estar na allow-list do servidor (senão é
// descartada em silêncio), e a allow-list não deve ter nomes que nenhuma ferramenta usa.
const allowListBlock = /ALLOWED_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\)/.exec(vexChat)?.[1] ?? "";
const allowedNames = new Set([...allowListBlock.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]));
const { readdir } = await import("node:fs/promises");
const toolsDir = new URL("packages/vex/src/tools/", root);
const toolNames = new Set();
for (const file of await readdir(toolsDir)) {
  if (!file.endsWith("Tools.ts")) continue;
  const text = await readFile(new URL(file, toolsDir), "utf8");
  for (const match of text.matchAll(/^\s*name: "([a-z_]+)",$/gm)) toolNames.add(match[1]);
}
assert.ok(toolNames.size > 0, "vex: nenhuma ferramenta encontrada em packages/vex/src/tools");
const missingOnServer = [...toolNames].filter((name) => !allowedNames.has(name));
const unusedOnServer = [...allowedNames].filter((name) => !toolNames.has(name));
assert.deepEqual(missingOnServer, [], `vex-chat: ferramentas fora da allow-list: ${missingOnServer.join(", ")}`);
assert.deepEqual(unusedOnServer, [], `vex-chat: nomes na allow-list sem ferramenta: ${unusedOnServer.join(", ")}`);

const vexWebSearch = await source("vex-web-search");
requirePattern("vex-web-search", vexWebSearch, /supabase\.auth\.getUser\(token\)/, "autenticação do bearer token");
requirePattern("vex-web-search", vexWebSearch, /MAX_REQUESTS_PER_WINDOW\s*=\s*10/, "limite por usuário");
requirePattern("vex-web-search", vexWebSearch, /replace\(\/[\\u0000-\\u001F\\u007F]/, "remoção de caracteres de controle");
requirePattern("vex-web-search", vexWebSearch, /\.from\("app_secrets"\)/, "segredo fora do bundle");
requirePattern("vex-web-search", vexWebSearch, /new AbortController\(\)/, "timeout do provedor");
requirePattern("vex-web-search", vexWebSearch, /checkQuerySafety\(query\)/, "bloqueio de pesquisa pornográfica antes da busca externa");
assert.ok(vexWebSearch.indexOf("checkQuerySafety(query)") < vexWebSearch.indexOf("reserveMonthlyQuota("), "vex-web-search: valide a intenção antes de reservar cota ou chamar a busca externa");

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

const waitlist = await source("waitlist-join");
requirePattern("waitlist-join", waitlist, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/, "Turnstile conferido no servidor");
requirePattern("waitlist-join", waitlist, /turnstile_secret_key/, "chave secreta fora do cliente");
requirePattern("waitlist-join", waitlist, /body\.website/, "campo-armadilha anti-robô");
requirePattern("waitlist-join", waitlist, /waitlist_register/, "limite por IP e gravação no banco");
requirePattern("waitlist-join", waitlist, /if \(!allowed\) return json/, "origem permitida");

// Funções chamadas sem JWT de usuário precisam estar declaradas em config.toml; publicar pela CLI
// sem isso as deixaria exigindo login (cron, retorno do Google e formulário do site parariam).
const config = await readFile(new URL("supabase/config.toml", root), "utf8");
for (const name of ["send-notifications", "sync-google-calendar", "google-oauth-callback", "waitlist-join", "stripe-webhook", "billing-app-return"]) {
  const section = config.split(`[functions.${name}]`)[1]?.split("[functions.")[0] ?? "";
  assert.match(section, /verify_jwt = false/, `config.toml: ${name} precisa de verify_jwt = false`);
}

console.log("edge function security invariants passed");
