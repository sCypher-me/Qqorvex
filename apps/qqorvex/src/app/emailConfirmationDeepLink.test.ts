import { describe, expect, it } from "vitest";
import { parseEmailConfirmationDeepLink } from "./emailConfirmationDeepLink";

describe("parseEmailConfirmationDeepLink", () => {
  it("extracts the signup PKCE code from the registered HTTPS callback", () => {
    expect(parseEmailConfirmationDeepLink("https://qqorvex-app.pages.dev/login?code=signup-code")).toEqual({
      type: "code",
      code: "signup-code",
    });
  });

  it("accepts signup token hashes and implicit-flow sessions from query or fragment", () => {
    expect(parseEmailConfirmationDeepLink("https://qqorvex-app.pages.dev/login?token_hash=hash&type=signup")).toEqual({
      type: "token_hash",
      tokenHash: "hash",
    });
    expect(parseEmailConfirmationDeepLink("https://qqorvex-app.pages.dev/login#access_token=access&refresh_token=refresh")).toEqual({
      type: "session",
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("rejects unexpected hosts, paths, and incomplete credentials", () => {
    expect(parseEmailConfirmationDeepLink("https://evil.example/login?code=code")).toBeNull();
    expect(parseEmailConfirmationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite?code=code")).toBeNull();
    expect(parseEmailConfirmationDeepLink("https://qqorvex-app.pages.dev/login#access_token=access")).toBeNull();
    expect(parseEmailConfirmationDeepLink("not a url")).toBeNull();
  });
});
