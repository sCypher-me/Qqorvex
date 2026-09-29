// Sincroniza entitlements somente a partir de eventos autenticados pela assinatura da Stripe.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Webhook not configured", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe-Signature", { status: 400 });
  const payload = await req.text();
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.warn("Stripe webhook signature rejected", error);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: previouslyProcessed, error: eventLookupError } = await supabase
    .from("billing_webhook_events")
    .select("event_id")
    .eq("provider", "stripe")
    .eq("event_id", event.id)
    .maybeSingle();
  if (eventLookupError) return new Response("Could not check event", { status: 500 });
  if (previouslyProcessed) return new Response("Already processed", { status: 200 });

  try {
    if (!["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const { error } = await supabase.from("billing_webhook_events").insert({ provider: "stripe", event_id: event.id, event_type: event.type });
      if (error && error.code !== "23505") throw error;
      return new Response("Event ignored", { status: 200 });
    }

    const eventSubscription = event.data.object as Stripe.Subscription;
    const subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
    const customerId = idOf(subscription.customer);
    const userId = subscription.metadata?.user_id;
    const { data: existing, error: lookupError } = userId
      ? { data: null, error: null }
      : await supabase.from("billing_subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    if (lookupError) throw lookupError;
    const resolvedUserId = userId || existing?.user_id;
    if (!resolvedUserId || !customerId) throw new Error("Stripe subscription has no linked Qqorvex user.");

    const firstItem = subscription.items.data[0];
    const interval = firstItem?.price?.recurring?.interval;
    if (interval !== "month" && interval !== "year") throw new Error("Plus price must recur monthly or annually.");
    const values = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };
    if (!values.current_period_end) throw new Error("Stripe subscription has no current_period_end.");
    const knownStatuses = new Set(["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"]);
    const status = knownStatuses.has(subscription.status) ? subscription.status : "expired";
    const { error: saveError } = await supabase.from("billing_subscriptions").upsert({
      user_id: resolvedUserId,
      provider: "stripe",
      plan_key: "plus",
      billing_period: interval === "year" ? "annual" : "monthly",
      status,
      current_period_start: values.current_period_start ? new Date(values.current_period_start * 1_000).toISOString() : null,
      current_period_end: new Date(values.current_period_end * 1_000).toISOString(),
      cancel_at_period_end: values.cancel_at_period_end ?? false,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      play_product_id: null,
      play_purchase_token_hash: null,
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;
    const { error: eventError } = await supabase.from("billing_webhook_events").insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
    });
    if (eventError && eventError.code !== "23505") throw eventError;
    return new Response("Subscription synchronized", { status: 200 });
  } catch (error) {
    console.error("Stripe subscription synchronization failed", event.id, error);
    return new Response("Could not synchronize subscription", { status: 500 });
  }
});
