import { describe, expect, it } from "vitest";
import { needsSocialPasswordSetup } from "./initialAccountFlow";

const now = Date.parse("2026-10-06T20:00:00Z");

describe("needsSocialPasswordSetup", () => {
  it("does not ask email-and-password signups to set their password twice", () => {
    expect(needsSocialPasswordSetup({
      created_at: new Date(now).toISOString(),
      app_metadata: { provider: "email" },
      user_metadata: { qqorvex_onboarding_pending: true },
    }, now)).toBe(false);
  });

  it.each(["google", "discord", "github"])("requires a password for new %s registrations", (provider) => {
    expect(needsSocialPasswordSetup({
      created_at: new Date(now).toISOString(),
      app_metadata: { provider },
      user_metadata: {},
    }, now)).toBe(true);
  });

  it("keeps an interrupted password step pending, then stops after completion", () => {
    const user = {
      created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      app_metadata: { provider: "google" },
      user_metadata: { qqorvex_password_setup_pending: true },
    };
    expect(needsSocialPasswordSetup(user, now)).toBe(true);
    expect(needsSocialPasswordSetup({ ...user, user_metadata: { qqorvex_password_setup_completed: true } }, now)).toBe(false);
    expect(needsSocialPasswordSetup({ ...user, user_metadata: { qqorvex_onboarding_completed: true } }, now)).toBe(false);
  });

  it("does not interrupt existing social accounts", () => {
    expect(needsSocialPasswordSetup({
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      app_metadata: { provider: "github" },
      user_metadata: {},
    }, now)).toBe(false);
  });

  it("does not ask a recently created email account to choose a second password after social linking", () => {
    expect(needsSocialPasswordSetup({
      created_at: new Date(now - 60_000).toISOString(),
      identities: [{ provider: "email" }, { provider: "google" }],
      app_metadata: { provider: "google" },
      user_metadata: { qqorvex_onboarding_pending: true },
    }, now, String(now - 30_000))).toBe(false);
  });
});
