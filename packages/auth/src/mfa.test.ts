import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { getAssuranceLevel } from "./mfa";

function fakeClient(getAssuranceLevelCall: () => Promise<unknown>): SupabaseClient<Database> {
  return {
    auth: {
      mfa: { getAuthenticatorAssuranceLevel: getAssuranceLevelCall },
    },
  } as unknown as SupabaseClient<Database>;
}

describe("getAssuranceLevel", () => {
  it("returns the current and next assurance levels", async () => {
    const result = await getAssuranceLevel(
      fakeClient(vi.fn().mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null })),
      20,
    );

    expect(result).toEqual({ current: "aal1", next: "aal2" });
  });

  it("fails when Supabase returns an error", async () => {
    const error = new Error("network");

    await expect(
      getAssuranceLevel(fakeClient(vi.fn().mockResolvedValue({ data: null, error })), 20),
    ).rejects.toBe(error);
  });

  it("fails closed when the assurance request stays pending", async () => {
    const pending = new Promise<never>(() => undefined);

    await expect(getAssuranceLevel(fakeClient(vi.fn().mockReturnValue(pending)), 5)).rejects.toThrow(
      "A validação do 2FA demorou demais",
    );
  });
});
