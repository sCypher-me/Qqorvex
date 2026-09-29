export type PlusSubscriptionSnapshot = {
  plan_key: string;
  status: string;
  current_period_end: string | null;
};

/** Entitlement follows the server-synced subscription window, including cancellation at period end. */
export function hasPlusEntitlement(
  subscription: PlusSubscriptionSnapshot | null | undefined,
  now = Date.now(),
  isOwner = false,
): boolean {
  // Owner entitlement is mirrored by the protected `profiles.role` check in Supabase.
  if (isOwner) return true;
  if (!subscription || subscription.plan_key !== "plus") return false;
  if (!["active", "trialing", "canceled"].includes(subscription.status)) return false;
  const periodEnd = subscription.current_period_end ? Date.parse(subscription.current_period_end) : Number.NaN;
  return Number.isFinite(periodEnd) && periodEnd > now;
}
