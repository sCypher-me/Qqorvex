/** Version recorded with each explicit acceptance of the Qqorvex terms. */
export const CURRENT_TERMS_VERSION = "2026-10-06-v1";

/** Short-lived browser receipt used only to resume a checked OAuth signup after redirect. */
export const PENDING_TERMS_ACCEPTANCE_KEY = "qqorvex.terms.acceptance.pending";
export const PENDING_TERMS_ACCEPTANCE_TTL_MS = 30 * 60 * 1000;

export type TermsAcceptanceSource =
  | "email_signup"
  | "signup_gate"
  | "oauth_registration"
  | "invite_acceptance";

export function savePendingTermsReceipt(now = Date.now()): void {
  try {
    window.sessionStorage.setItem(PENDING_TERMS_ACCEPTANCE_KEY, JSON.stringify({
      version: CURRENT_TERMS_VERSION,
      expiresAt: now + PENDING_TERMS_ACCEPTANCE_TTL_MS,
    }));
  } catch {
    // If storage is unavailable, the signed-in account will be asked to accept explicitly.
  }
}

export function clearPendingTermsReceipt(): void {
  try {
    window.sessionStorage.removeItem(PENDING_TERMS_ACCEPTANCE_KEY);
  } catch {
    // Optional browser storage.
  }
}

export function hasPendingTermsReceipt(accountCreatedAt: string, now = Date.now()): boolean {
  try {
    const value = window.sessionStorage.getItem(PENDING_TERMS_ACCEPTANCE_KEY);
    if (!value) return false;
    const receipt = JSON.parse(value) as { version?: unknown; expiresAt?: unknown };
    const startedAtValue = window.sessionStorage.getItem("qqorvex.oauth.started_at");
    const oauthStartedAt = startedAtValue ? Number(startedAtValue) : Number.NaN;
    const accountCreated = Date.parse(accountCreatedAt);
    const valid = receipt.version === CURRENT_TERMS_VERSION
      && typeof receipt.expiresAt === "number"
      && receipt.expiresAt >= now
      && receipt.expiresAt <= now + PENDING_TERMS_ACCEPTANCE_TTL_MS;
    const belongsToThisSignup = Number.isFinite(oauthStartedAt)
      && Number.isFinite(accountCreated)
      && accountCreated >= oauthStartedAt - 5 * 60 * 1000
      && accountCreated <= oauthStartedAt + PENDING_TERMS_ACCEPTANCE_TTL_MS;
    if (!valid || !belongsToThisSignup) clearPendingTermsReceipt();
    return valid && belongsToThisSignup;
  } catch {
    clearPendingTermsReceipt();
    return false;
  }
}
