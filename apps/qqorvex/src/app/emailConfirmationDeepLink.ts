const EMAIL_CONFIRMATION_URL = {
  origin: "https://qqorvex-app.pages.dev",
  pathname: "/login",
} as const;

export type EmailConfirmationDeepLinkPayload =
  | { type: "code"; code: string }
  | { type: "session"; accessToken: string; refreshToken: string }
  | { type: "token_hash"; tokenHash: string }
  | null;

/** Accept only the production email callback so arbitrary links cannot inject auth credentials. */
export function parseEmailConfirmationDeepLink(value: string): EmailConfirmationDeepLinkPayload {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== EMAIL_CONFIRMATION_URL.origin || url.pathname !== EMAIL_CONFIRMATION_URL.pathname) {
      return null;
    }

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const getParam = (name: string) => fragment.get(name) ?? url.searchParams.get(name);
    const code = getParam("code");
    if (code) return { type: "code", code };

    const tokenHash = getParam("token_hash");
    if (tokenHash && getParam("type") === "signup") return { type: "token_hash", tokenHash };

    const accessToken = getParam("access_token");
    const refreshToken = getParam("refresh_token");
    if (accessToken && refreshToken) return { type: "session", accessToken, refreshToken };

    return null;
  } catch {
    return null;
  }
}
