import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Entre na sua conta." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Serviço indisponível." }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: "Sessão inválida." }, 401);
    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", data.user.id).single();
    if (profileError) return json({ error: "Não foi possível verificar sua permissão." }, 503);
    if (profile?.role !== "dono") return json({ error: "Acesso exclusivo ao Dono." }, 403);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Pedido inválido." }, 400); }
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Informe um e-mail válido." }, 400);
    // Nunca aceita redirect arbitrário ou privilégios vindos do cliente.
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://qqorvex-app.pages.dev/aceitar-convite",
      data: { qqorvex_onboarding_pending: true },
    });
    if (inviteError) return json({ error: inviteError.status === 429 ? "Aguarde antes de enviar outro convite." : "Não foi possível enviar. Confira se a conta já existe e tente novamente." }, inviteError.status === 429 ? 429 : 400);
    return json({ sent: true });
  } catch { return json({ error: "Não foi possível enviar o convite." }, 503); }
});
