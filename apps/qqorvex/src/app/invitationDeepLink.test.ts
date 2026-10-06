import { describe, expect, it } from "vitest";
import { parseInvitationDeepLink } from "./invitationDeepLink";

describe("parseInvitationDeepLink", () => {
  it("accepts Supabase PKCE invitation callbacks on the invitation page", () => {
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite?code=invite-code")).toEqual({
      type: "code",
      code: "invite-code",
    });
  });

  it("accepts an invite token hash from the query or URL fragment", () => {
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite?token_hash=hash&type=invite")).toEqual({
      type: "token_hash",
      tokenHash: "hash",
    });
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite#token_hash=hash&type=invite")).toEqual({
      type: "token_hash",
      tokenHash: "hash",
    });
  });

  it("accepts implicit invitation sessions from the fragment", () => {
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite#access_token=access&refresh_token=refresh&type=invite")).toEqual({
      type: "session",
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("opens the invitation page when the link has no credential or has expired", () => {
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite")).toEqual({ type: "page" });
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite?error=access_denied")).toEqual({ type: "page" });
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/aceitar-convite?token_hash=hash&type=recovery")).toEqual({ type: "page" });
  });

  it("rejects links outside the exact HTTPS invitation route", () => {
    expect(parseInvitationDeepLink("http://qqorvex-app.pages.dev/aceitar-convite?code=unsafe")).toBeNull();
    expect(parseInvitationDeepLink("https://attacker.example/aceitar-convite?code=unsafe")).toBeNull();
    expect(parseInvitationDeepLink("https://qqorvex-app.pages.dev/login?code=unsafe")).toBeNull();
    expect(parseInvitationDeepLink("not a url")).toBeNull();
  });
});
