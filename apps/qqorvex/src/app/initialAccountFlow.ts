type InitialAccountUser = {
  created_at: string;
  identities?: Array<{ provider?: string }> | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

const SOCIAL_PROVIDERS = new Set(["google", "discord", "github"]);
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_WINDOW_MS = 5 * 60 * 1000;

/** New social accounts set a Qqorvex password before onboarding; email registrations already chose one. */
export function needsSocialPasswordSetup(user: InitialAccountUser, now = Date.now(), oauthStartedAtValue?: string | null): boolean {
  const metadata = user.user_metadata ?? {};
  if (metadata.qqorvex_onboarding_completed === true || metadata.qqorvex_password_setup_completed === true) return false;
  if (metadata.qqorvex_password_setup_pending === true) return true;

  const provider = user.app_metadata?.provider;
  if (typeof provider !== "string" || !SOCIAL_PROVIDERS.has(provider)) return false;

  // Contas que já tinham identidade de e-mail possuem senha escolhida no cadastro direto.
  // O Supabase pode vincular uma identidade social a elas durante o OAuth.
  if (user.identities?.some((identity) => identity.provider === "email")) return false;

  const createdAt = Date.parse(user.created_at);
  if (!Number.isFinite(createdAt)) return false;
  const accountAge = now - createdAt;
  const newlyCreated = accountAge >= -CLOCK_SKEW_WINDOW_MS && accountAge <= NEW_ACCOUNT_WINDOW_MS;
  const startedAt = Number(oauthStartedAtValue);
  const startedDuringSignup = Number.isFinite(startedAt)
    && createdAt >= startedAt - CLOCK_SKEW_WINDOW_MS
    && createdAt <= startedAt + NEW_ACCOUNT_WINDOW_MS;
  return newlyCreated || startedDuringSignup;
}
