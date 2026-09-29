import { describe, expect, it, vi } from "vitest";
import type { Database, Session, SupabaseClient } from "@qqorvex/database";
import { resolveInitialSession } from "./initialSession";

function fakeClient(getSession: () => Promise<unknown>): SupabaseClient<Database> {
  return { auth: { getSession } } as unknown as SupabaseClient<Database>;
}

describe("resolveInitialSession", () => {
  it("returns the session when the auth client responds", async () => {
    const session = { user: { id: "user-1" } } as unknown as Session;

    const result = await resolveInitialSession(
      fakeClient(vi.fn().mockResolvedValue({ data: { session } })),
      20,
    );

    expect(result).toBe(session);
  });

  it("fails closed when the auth client rejects", async () => {
    const result = await resolveInitialSession(
      fakeClient(vi.fn().mockRejectedValue(new Error("network"))),
      20,
    );

    expect(result).toBeNull();
  });

  it("fails closed when the auth client stays pending", async () => {
    const pending = new Promise<never>(() => undefined);
    const result = await resolveInitialSession(fakeClient(vi.fn().mockReturnValue(pending)), 5);

    expect(result).toBeNull();
  });
});
