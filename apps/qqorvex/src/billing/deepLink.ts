export type BillingCheckoutReturn = "success" | "cancelled" | "portal_return";

/** Only accepts the two fixed billing callbacks registered in the Android app. */
export function parseBillingCheckoutReturn(rawUrl: string): BillingCheckoutReturn | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "qqorvex:" || url.hostname !== "assinatura" || (url.pathname !== "" && url.pathname !== "/")) {
      return null;
    }
    const outcome = url.searchParams.get("checkout");
    return outcome === "success" || outcome === "cancelled" || outcome === "portal_return" ? outcome : null;
  } catch {
    return null;
  }
}
