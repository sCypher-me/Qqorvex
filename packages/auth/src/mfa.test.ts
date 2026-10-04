import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { enrollTotp, getAssuranceLevel } from "./mfa";

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

describe("enrollTotp", () => {
  function fakeEnrollClient(qrCode: string): SupabaseClient<Database> {
    return {
      auth: {
        mfa: {
          enroll: vi.fn().mockResolvedValue({
            data: { id: "factor-1", totp: { qr_code: qrCode, secret: "secret" } },
            error: null,
          }),
        },
      },
    } as unknown as SupabaseClient<Database>;
  }

  it("uses the data URI already returned by Supabase JS", async () => {
    const qrCode = "data:image/svg+xml;utf-8,<svg></svg>";
    const result = await enrollTotp(fakeEnrollClient(qrCode));

    expect(result.enrollment?.qrCodeDataUri).toBe(qrCode);
  });

  it("wraps a raw SVG for compatibility with older Supabase JS responses", async () => {
    const result = await enrollTotp(fakeEnrollClient("<svg><path d=\"a#b\" /></svg>"));

    expect(result.enrollment?.qrCodeDataUri).toBe(
      "data:image/svg+xml;utf-8,%3Csvg%3E%3Cpath%20d%3D%22a%23b%22%20%2F%3E%3C%2Fsvg%3E",
    );
  });
});
