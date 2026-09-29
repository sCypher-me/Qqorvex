import { describe, expect, it } from "vitest";
import { parseOAuthCallback } from "./oauthDeepLink";

describe("parseOAuthCallback", () => {
  it("extracts a PKCE authorization code from the registered app callback", () => {
    expect(parseOAuthCallback("qqorvex://auth/callback?code=pkce-code")).toEqual({
      type: "code",
      code: "pkce-code",
    });
  });

  it("reads the implicit-flow session tokens from the callback fragment", () => {
    expect(parseOAuthCallback("qqorvex://auth/callback#access_token=access&refresh_token=refresh")).toEqual({
      type: "session",
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("ignores unrelated links, malformed URLs and callbacks without a code", () => {
    expect(parseOAuthCallback("qqorvex://assinatura?checkout=success")).toBeNull();
    expect(parseOAuthCallback("https://qqorvex.com/auth/callback?code=pkce-code")).toBeNull();
    expect(parseOAuthCallback("qqorvex://auth/callback?error=access_denied")).toBeNull();
    expect(parseOAuthCallback("not a url")).toBeNull();
  });
});
