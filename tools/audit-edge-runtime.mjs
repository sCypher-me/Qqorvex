import assert from "node:assert/strict";

const baseUrl = (process.env.SUPABASE_FUNCTIONS_BASE_URL ?? process.env.SUPABASE_URL ?? "")
  .replace(/\/$/, "");

if (!baseUrl) {
  throw new Error(
    "Defina SUPABASE_FUNCTIONS_BASE_URL (ou SUPABASE_URL) antes de executar este smoke test."
  );
}

const functions = [
  { name: "vex-chat", expected: new Set([401]) },
  { name: "vex-web-search", expected: new Set([401]) },
  { name: "create-zoom-meeting", expected: new Set([401]) },
  { name: "sync-google-calendar", expected: new Set([401]) },
  { name: "send-notifications", expected: new Set([401]) },
  // O callback sem state pode redirecionar para a tela de erro ou rejeitar a entrada,
  // mas nunca deve concluir um fluxo OAuth não autenticado.
  { name: "google-oauth-callback", expected: new Set([302, 303, 307, 308, 400, 401, 403]) },
];

for (const fn of functions) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/${fn.name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  assert.ok(
    fn.expected.has(response.status),
    `${fn.name}: status inesperado ${response.status}`
  );
  console.log(`${fn.name}: ${response.status}`);
}

console.log("edge runtime unauthenticated smoke passed");
