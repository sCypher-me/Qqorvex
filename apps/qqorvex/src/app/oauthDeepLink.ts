export const OAUTH_MOBILE_CALLBACK_URL = "qqorvex://auth/callback";

export type OAuthCallbackPayload =
  | { type: "code"; code: string }
  | { type: "session"; accessToken: string; refreshToken: string }
  | null;

export function parseOAuthCallback(value: string): OAuthCallbackPayload {
  try {
    const url = new URL(value);
    if (url.protocol !== "qqorvex:" || url.hostname !== "auth" || url.pathname !== "/callback") {
      return null;
    }

    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    const code = url.searchParams.get("code") ?? fragment.get("code");
    if (code) return { type: "code", code };

    const accessToken = fragment.get("access_token") ?? url.searchParams.get("access_token");
    const refreshToken = fragment.get("refresh_token") ?? url.searchParams.get("refresh_token");
    if (accessToken && refreshToken) return { type: "session", accessToken, refreshToken };

    return null;
  } catch {
    return null;
  }
}
