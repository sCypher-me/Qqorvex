import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(new URL("../packages/auth/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../supabase/functions/invite-user/index.ts", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
async function exercise({ token, role = "usuario", user = true, body = { email: " TEST@EXAMPLE.COM ", role: "dono", redirectTo: "https://evil.example" } }) {
  let handler, invitation;
  const admin = {
    auth: { getUser: async () => ({ data: { user: user ? { id: "actor" } : null }, error: null }), admin: { inviteUserByEmail: async (...args) => { invitation = args; return { error: null }; } } },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role }, error: null }) }) }) }),
  };
  runInNewContext(code, { Response, createClient: () => admin, Deno: { env: { get: () => "server-only" }, serve: value => { handler = value; } } });
  const response = await handler(new Request("https://example.com", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }));
  return { status: response.status, invitation };
}
assert.deepEqual(await exercise({}), { status: 401, invitation: undefined });
assert.deepEqual(await exercise({ token: "invalid", user: false }), { status: 401, invitation: undefined });
assert.deepEqual(await exercise({ token: "valid" }), { status: 403, invitation: undefined });
assert.deepEqual(await exercise({ token: "valid", role: "dono", body: { email: "bad" } }), { status: 400, invitation: undefined });
const owner = await exercise({ token: "valid", role: "dono" });
assert.equal(owner.status, 200);
assert.deepEqual(JSON.parse(JSON.stringify(owner.invitation)), ["test@example.com", { redirectTo: "https://qqorvex-app.pages.dev/aceitar-convite", data: { qqorvex_onboarding_pending: true } }]);
console.log("PASS: convite rejeita sessão ausente/inválida, usuário comum e e-mail inválido; ignora privilégios e redirect enviados pelo cliente.");
