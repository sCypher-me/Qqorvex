import { describe, expect, it } from "vitest";
import { hasPlusEntitlement } from "./entitlements";

describe("Plus entitlements", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z");

  it("grants permanent Plus to the protected owner account without a paid subscription", () => {
    expect(hasPlusEntitlement(null, now, true)).toBe(true);
  });

  it.each(["active", "trialing", "canceled"])("grants access for %s while the paid period is active", (status) => {
    expect(hasPlusEntitlement({
      plan_key: "plus",
      status,
      current_period_end: "2026-10-01T00:00:00.000Z",
    }, now)).toBe(true);
  });

  it.each([
    { plan_key: "free", status: "active", current_period_end: "2026-10-01T00:00:00.000Z" },
    { plan_key: "plus", status: "past_due", current_period_end: "2026-10-01T00:00:00.000Z" },
    { plan_key: "plus", status: "canceled", current_period_end: "2026-09-28T11:59:59.000Z" },
    { plan_key: "plus", status: "active", current_period_end: null },
  ])("does not grant access without a valid Plus entitlement", (subscription) => {
    expect(hasPlusEntitlement(subscription, now)).toBe(false);
  });

  it("does not grant owner access unless the trusted profile marks the account as owner", () => {
    expect(hasPlusEntitlement(null, now, false)).toBe(false);
  });
});
