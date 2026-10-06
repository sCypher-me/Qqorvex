const INVITATION_URL = {
  origin: "https://qqorvex-app.pages.dev",
  pathname: "/aceitar-convite",
} as const;

export type InvitationDeepLinkPayload =
  | { type: "code"; code: string }
  | { type: "session"; accessToken: string; refreshToken: string }
  | { type: "token_hash"; tokenHash: string }
  | { type: "page" }
  | null;

/** Accept only the invite callback hosted by Qqorvex; never exchange credentials from arbitrary URLs. */
export function parseInvitationDeepLink(value: string): InvitationDeepLinkPayload {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== INVITATION_URL.origin || url.pathname !== INVITATION_URL.pathname) {
      return null;
    }

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const getParam = (name: string) => fragment.get(name) ?? url.searchParams.get(name);
    const code = getParam("code");
    if (code) return { type: "code", code };

    const tokenHash = getParam("token_hash");
    if (tokenHash && getParam("type") === "invite") return { type: "token_hash", tokenHash };

    const accessToken = getParam("access_token");
    const refreshToken = getParam("refresh_token");
    if (accessToken && refreshToken && getParam("type") === "invite") {
      return { type: "session", accessToken, refreshToken };
    }

    return { type: "page" };
  } catch {
    return null;
  }
}
