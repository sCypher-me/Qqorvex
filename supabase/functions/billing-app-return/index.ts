// Return URL HTTPS fixa: só encaminha estados permitidos ao deep link, sem alterar assinatura.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const outcomes = new Set(["success", "cancelled", "portal_return"]);

Deno.serve((req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const requestedOutcome = new URL(req.url).searchParams.get("checkout");
  if (!requestedOutcome || !outcomes.has(requestedOutcome)) return new Response("Invalid billing return", { status: 400 });

  const appReturnUrl = `qqorvex://assinatura?checkout=${requestedOutcome}`;
  const response = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Voltar ao Qqorvex</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: #101214; color: #f4f5f6; font: 16px system-ui, sans-serif; }
      main { max-width: 420px; text-align: center; }
      a { display: inline-flex; margin-top: 18px; padding: 13px 20px; border-radius: 12px; background: #f2635b; color: #fff; font-weight: 700; text-decoration: none; }
      p { color: #aeb5bd; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Volte ao Qqorvex</h1>
      <p>Se o app não abrir automaticamente, toque no botão abaixo. O plano é sincronizado pelo servidor.</p>
      <a href="${appReturnUrl}">Abrir Qqorvex</a>
    </main>
    <script>window.location.replace(${JSON.stringify(appReturnUrl)});</script>
  </body>
</html>`;

  return new Response(response, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
