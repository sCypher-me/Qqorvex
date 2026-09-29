// Abre uma sessão temporária do Stripe Customer Portal para o próprio usuário autenticado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "O gerenciamento de cobrança ainda não foi configurado." }, 503);

  let requestBody: { returnTarget?: string };
  try { requestBody = await req.json(); } catch { return json({ error: "Corpo inválido." }, 400); }
  const returnTarget = requestBody.returnTarget ?? "web";
  if (returnTarget !== "web" && returnTarget !== "app") return json({ error: "Destino de retorno inválido." }, 400);

  let returnUrl: string;
  if (returnTarget === "app") {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!supabaseUrl) throw new Error();
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== "https:") throw new Error();
      returnUrl = `${parsed.origin}/functions/v1/billing-app-return?checkout=portal_return`;
    } catch {
      return json({ error: "Não foi possível configurar o retorno seguro para o app." }, 503);
    }
  } else {
    try {
      const baseUrl = Deno.env.get("APP_BASE_URL");
      if (!baseUrl) throw new Error();
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") throw new Error();
      returnUrl = `${parsed.origin}/assinatura`;
    } catch {
      return json({ error: "APP_BASE_URL precisa ser uma URL HTTPS válida para o portal web." }, 503);
    }
  }

  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const { data: subscription, error } = await supabase
    .from("billing_subscriptions")
    .select("provider,stripe_customer_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (error) return json({ error: "Não foi possível localizar sua assinatura." }, 500);
  if (subscription?.provider !== "stripe" || !subscription.stripe_customer_id) {
    return json({ error: "Esta assinatura não é gerenciada pela Stripe." }, 409);
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });
    return json({ url: session.url });
  } catch (caught) {
    console.error("Stripe billing portal failed", caught);
    return json({ error: "Não foi possível abrir o gerenciamento da assinatura." }, 502);
  }
});
