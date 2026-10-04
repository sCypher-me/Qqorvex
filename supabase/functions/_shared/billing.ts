import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type BillingFeature = "vex_ai_responses" | "vex_web_searches";
type QuotaResult = {
  allowed: boolean;
  used: number;
  /** `null` = acesso Ilimitado (Lifetime, Parceiro ativo, Dono): nunca recusado. */
  limit: number | null;
  month_start: string;
  plan?: "free" | "plus" | "unlimited";
};

export async function reserveMonthlyQuota(
  client: SupabaseClient,
  userId: string,
  feature: BillingFeature,
): Promise<{ quota: QuotaResult | null; error: boolean }> {
  const { data, error } = await client.rpc("consume_billing_quota", {
    p_user_id: userId,
    p_feature: feature,
  });
  if (error || !data || typeof data !== "object") {
    console.error("Billing quota could not be checked", feature, error);
    return { quota: null, error: true };
  }
  return { quota: data as QuotaResult, error: false };
}

export async function releaseMonthlyQuota(
  client: SupabaseClient,
  userId: string,
  feature: BillingFeature,
  monthStart: string,
): Promise<void> {
  const { error } = await client.rpc("release_billing_quota", {
    p_user_id: userId,
    p_feature: feature,
    p_month_start: monthStart,
  });
  if (error) console.error("Billing quota reservation could not be released", feature, error);
}
