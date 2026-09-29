// Cria uma sessao Stripe Checkout para o Plus. O cliente nunca escolhe preco/moeda:
// somente os Price IDs configurados no servidor sao aceitos.
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

function getBearer(req: Request) {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const monthlyPrice = Deno.env.get("STRIPE_PRICE_PLUS_MONTHLY");
  const annualPrice = Deno.env.get("STRIPE_PRICE_PLUS_ANNUAL");
  if (!stripeKey || !monthlyPrice || !annualPrice) {
    return json({ error: "A cobrança ainda não foi configurada no servidor." }, 503);
  }

  let body: { billingPeriod?: string; returnTarget?: string };
  try { body = await req.json(); } catch { return json({ error: "Corpo inválido." }, 400); }
  if (body.billingPeriod !== "monthly" && body.billingPeriod !== "annual") {
    return json({ error: "Escolha uma periodicidade válida." }, 400);
  }
  const returnTarget = body.returnTarget ?? "web";
  if (returnTarget !== "web" && returnTarget !== "app") {
    return json({ error: "Destino de retorno inválido." }, 400);
  }

  let successUrl: string;
  let cancelUrl: string;
  if (returnTarget === "app") {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!supabaseUrl) throw new Error();
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== "https:") throw new Error();
      const returnBase = `${parsed.origin}/functions/v1/billing-app-return`;
      successUrl = `${returnBase}?checkout=success`;
      cancelUrl = `${returnBase}?checkout=cancelled`;
    } catch {
      return json({ error: "Não foi possível configurar o retorno seguro para o app." }, 503);
    }
  } else {
    const baseUrl = Deno.env.get("APP_BASE_URL");
    try {
      if (!baseUrl) throw new Error();
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") throw new Error();
      const appOrigin = parsed.origin;
      successUrl = `${appOrigin}/assinatura?checkout=success`;
      cancelUrl = `${appOrigin}/assinatura?checkout=cancelled`;
    } catch {
      return json({ error: "APP_BASE_URL precisa ser uma URL HTTPS válida para o checkout web." }, 503);
    }
  }

  const token = getBearer(req);
  if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const user = authData.user;

  const { data: existing, error: lookupError } = await supabase
    .from("billing_subscriptions")
    .select("provider,status,current_period_end,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) return json({ error: "Não foi possível verificar sua assinatura." }, 500);
  if (existing && ["active", "trialing", "past_due", "unpaid", "paused"].includes(existing.status)) {
    return json({ error: "Já existe uma assinatura vinculada à sua conta. Acesse Gerenciar assinatura." }, 409);
  }
  if (existing?.status === "canceled" && existing.current_period_end && Date.parse(existing.current_period_end) > Date.now()) {
    return json({ error: "Seu acesso Plus continua ativo até o fim do período atual." }, 409);
  }

  try {
    const stripe = new Stripe(stripeKey);
    const price = body.billingPeriod === "annual" ? annualPrice : monthlyPrice;
    const configuredPrice = await stripe.prices.retrieve(price);
    const expectedInterval = body.billingPeriod === "annual" ? "year" : "month";
    const expectedAmount = body.billingPeriod === "annual" ? 21_490 : 1_990;
    if (
      !configuredPrice.active
      || configuredPrice.currency !== "brl"
      || configuredPrice.unit_amount !== expectedAmount
      || configuredPrice.recurring?.interval !== expectedInterval
    ) {
      console.error("Stripe Plus price configuration does not match the approved catalog", body.billingPeriod);
      return json({ error: "O preço configurado para o Qqorvex Plus está incorreto. Avise o suporte antes de tentar novamente." }, 503);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_key: "plus", billing_period: body.billingPeriod },
      subscription_data: { metadata: { user_id: user.id, plan_key: "plus", billing_period: body.billingPeriod } },
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "pt-BR",
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : user.email ? { customer_email: user.email } : {}),
    }, { idempotencyKey: `qqorvex-checkout-${user.id}-${crypto.randomUUID()}` });

    if (!session.url) return json({ error: "A Stripe não retornou o endereço seguro de pagamento." }, 502);
    return json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session failed", error);
    return json({ error: "Não foi possível iniciar o checkout agora. Tente novamente." }, 502);
  }
});
