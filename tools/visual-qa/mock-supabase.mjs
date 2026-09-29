import { loadSchema } from "./schema.mjs";
import { fixtures, rpcFixtures, USER_ID } from "./fixtures.mjs";

/**
 * Supabase simulado no nível do navegador (Playwright `page.route`). Implementa o subconjunto de
 * PostgREST que o app usa: filtros simples, ordenação, limite, `single()`/`maybeSingle()` e
 * escrita em memória — o suficiente para navegar e interagir com as telas sem backend real.
 */
export const MOCK_SUPABASE_URL = "https://qa-mock.supabase.co";
export const STORAGE_KEY = "sb-qa-mock-auth-token";

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function fakeSession({ onboarding = false } = {}) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const user = {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "ana.souza@exemplo.com",
    email_confirmed_at: new Date(Date.now() - 86_400_000 * 60).toISOString(),
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: onboarding ? { full_name: "Ana Souza", qqorvex_onboarding_pending: true } : { full_name: "Ana Souza", qqorvex_onboarding_completed: true },
    identities: [],
    factors: [],
    created_at: new Date(Date.now() - 86_400_000 * 60).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const accessToken = [
    b64url({ alg: "HS256", typ: "JWT" }),
    b64url({ sub: USER_ID, aud: "authenticated", role: "authenticated", exp, aal: "aal1", amr: [{ method: "password", timestamp: Math.floor(Date.now() / 1000) }], session_id: "qa-session" }),
    "qa-signature",
  ].join(".");
  return { access_token: accessToken, refresh_token: "qa-refresh", token_type: "bearer", expires_in: 31_536_000, expires_at: exp, user };
}

export function createMockDatabase() {
  const { tables } = loadSchema();
  const db = {};
  const complete = (table, row) => ({ ...(tables[table] ?? {}), ...row });
  for (const [table, rows] of Object.entries(fixtures)) db[table] = rows.map((row) => complete(table, row));
  const rowsOf = (table) => (db[table] ??= []);
  return { db, rowsOf, complete, tables };
}

function parseValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (typeof a !== "boolean" && !Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== "" && !/^\d{4}-/.test(String(a))) return na - nb;
  return String(a).localeCompare(String(b));
}

function matches(row, column, expr) {
  const value = row[column];
  const dot = expr.indexOf(".");
  let op = expr.slice(0, dot);
  let arg = expr.slice(dot + 1);
  let negate = false;
  if (op === "not") {
    negate = true;
    const next = arg.indexOf(".");
    op = arg.slice(0, next);
    arg = arg.slice(next + 1);
  }
  let result = true;
  switch (op) {
    case "eq": result = String(value) === String(parseValue(arg)) || value === parseValue(arg); break;
    case "neq": result = String(value) !== String(parseValue(arg)); break;
    case "is": result = parseValue(arg) === null ? value === null || value === undefined : value === parseValue(arg); break;
    case "gt": result = compare(value, arg) > 0; break;
    case "gte": result = compare(value, arg) >= 0; break;
    case "lt": result = compare(value, arg) < 0; break;
    case "lte": result = compare(value, arg) <= 0; break;
    case "in": {
      const list = arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      result = list.includes(String(value));
      break;
    }
    case "like":
    case "ilike": {
      const pattern = new RegExp(`^${arg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/%/g, ".*")}$`, op === "ilike" ? "i" : "");
      result = pattern.test(String(value ?? ""));
      break;
    }
    case "cs": {
      const list = arg.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
      result = Array.isArray(value) && list.every((item) => value.includes(item));
      break;
    }
    default: result = true;
  }
  return negate ? !result : result;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "or", "and", "on_conflict", "columns"]);

function applyQuery(rows, params) {
  let out = rows.filter((row) => {
    for (const [key, expr] of params) {
      if (RESERVED.has(key)) continue;
      if (!matches(row, key, expr)) return false;
    }
    return true;
  });
  const orClause = params.find(([key]) => key === "or")?.[1];
  if (orClause) {
    const parts = orClause.replace(/^\(|\)$/g, "").split(",");
    out = out.filter((row) => parts.some((part) => {
      const firstDot = part.indexOf(".");
      return matches(row, part.slice(0, firstDot), part.slice(firstDot + 1));
    }));
  }
  const order = params.filter(([key]) => key === "order").map(([, value]) => value).join(",");
  if (order) {
    const specs = order.split(",").filter(Boolean).map((spec) => {
      const [column, direction] = spec.split(".");
      return { column, desc: direction === "desc" };
    });
    out = [...out].sort((a, b) => {
      for (const spec of specs) {
        const c = compare(a[spec.column], b[spec.column]);
        if (c !== 0) return spec.desc ? -c : c;
      }
      return 0;
    });
  }
  const offset = Number(params.find(([key]) => key === "offset")?.[1] ?? 0);
  const limit = params.find(([key]) => key === "limit")?.[1];
  out = out.slice(offset, limit ? offset + Number(limit) : undefined);
  return out;
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `99999999-0000-4000-8000-${String(idCounter).padStart(12, "0")}`;
}

/** Instala as rotas do mock numa página Playwright. */
export async function installSupabaseMock(page, { log = false, onboarding = false, owner = false } = {}) {
  const mock = createMockDatabase();
  if (owner) for (const profile of mock.db.profiles ?? []) profile.role = "dono";
  const session = fakeSession({ onboarding });

  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage indisponível
      }
    },
    [STORAGE_KEY, JSON.stringify(session)],
  );

  await page.route(`${MOCK_SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", ...headers }, body: JSON.stringify(body) });

    if (method === "OPTIONS") {
      return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    }

    if (path.startsWith("/auth/v1/")) {
      if (path.endsWith("/user")) return json(session.user);
      if (path.endsWith("/token")) return json(session);
      if (path.includes("/factors")) return json({ all: [], totp: [], phone: [] });
      return json({});
    }

    if (path.startsWith("/rest/v1/rpc/")) {
      const name = path.split("/").pop();
      if (log) console.log("rpc", name);
      return json(rpcFixtures[name] ?? null);
    }

    if (path.startsWith("/rest/v1/")) {
      const table = path.slice("/rest/v1/".length);
      const params = [...url.searchParams.entries()];
      const accept = request.headers()["accept"] ?? "";
      const single = accept.includes("vnd.pgrst.object");
      const rows = mock.rowsOf(table);
      if (log) console.log(method, table, url.search);

      if (method === "GET" || method === "HEAD") {
        const result = applyQuery(rows, params);
        if (single) return result[0] ? json(result[0]) : json({ code: "PGRST116", message: "no rows" }, 406);
        return json(result, 200, { "content-range": `0-${Math.max(result.length - 1, 0)}/${result.length}` });
      }

      const body = request.postDataJSON?.() ?? null;
      if (method === "POST") {
        const items = (Array.isArray(body) ? body : [body]).map((item) => mock.complete(table, { id: newId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...item }));
        rows.push(...items);
        return json(single ? items[0] : items, 201);
      }
      if (method === "PATCH") {
        const targets = applyQuery(rows, params);
        targets.forEach((row) => Object.assign(row, body, { updated_at: new Date().toISOString() }));
        return json(single ? targets[0] ?? null : targets);
      }
      if (method === "DELETE") {
        const targets = new Set(applyQuery(rows, params));
        const remaining = rows.filter((row) => !targets.has(row));
        rows.length = 0;
        rows.push(...remaining);
        return json(single ? [...targets][0] ?? null : [...targets]);
      }
    }

    if (path.startsWith("/functions/v1/")) {
      const fn = path.split("/").pop();
      if (fn === "vex-chat") {
        const payload = request.postDataJSON?.() ?? {};
        const messages = payload.messages ?? [];
        const tools = new Set((payload.tools ?? []).map((tool) => tool.name));
        const last = messages.at(-1) ?? {};
        const text = String(last.content ?? "").toLowerCase();
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (last.role === "tool" && last.toolName === "get_day_overview") {
          return json({
            kind: "message",
            content: [
              "### Seu dia, em blocos",
              "",
              "Você tem **3 compromissos** e **2 tarefas** com prazo hoje. Uma sugestão:",
              "",
              "1. **8h30–10h · Foco profundo**",
              "   - Finalizar a proposta do cliente (prioridade alta)",
              "   - Revisar o contrato",
              "2. **10h · Daily do time** (30 min)",
              "3. **14h–15h · Dentista** — saia às 13h40",
              "4. **16h · Blocos curtos**",
              "   - Pagar a fatura do cartão (vence amanhã)",
              "   - Registrar o treino",
              "",
              "> Deixei a noite livre: você já tem 5 dias seguidos de leitura, vale manter.",
              "",
              "Quer que eu crie esses blocos na agenda?",
            ].join("\n"),
          });
        }
        if (last.role === "tool") return json({ kind: "message", content: "Pronto! Criei a tarefa **Revisar contrato** para amanhã, com prioridade alta. Quer um lembrete às 9h?" });
        if (/dia/.test(text) && tools.has("get_day_overview")) return json({ kind: "tool_call", toolCall: { name: "get_day_overview", arguments: {} } });
        if (/tarefa/.test(text) && tools.has("create_task")) {
          const tomorrow = new Date(Date.now() + 86_400_000);
          const due = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
          return json({ kind: "tool_call", toolCall: { name: "create_task", arguments: { title: "Revisar contrato", dueDate: due, priority: "alta" } } });
        }
        return json({ kind: "message", content: "Claro! Olhei sua agenda: você tem **5 compromissos** hoje e **2 tarefas** de alta prioridade. Quer que eu monte blocos de foco entre as reuniões?" });
      }
      return json({ error: "indisponível no QA" }, 400);
    }

    if (path.startsWith("/storage/v1/")) {
      if (path.includes("/object/sign")) return json({ signedURL: "/favicon.png", signedUrl: "/favicon.png" });
      return json([]);
    }

    if (path.startsWith("/realtime/")) return route.abort();
    return json({});
  });

  return mock;
}
