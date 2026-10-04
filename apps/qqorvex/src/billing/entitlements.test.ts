import { describe, expect, it } from "vitest";
import { accessLabel, hasPlusEntitlement, parseAccountAccess } from "./entitlements";

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

describe("parseAccountAccess", () => {
  it("lê o acesso devolvido por get_my_access", () => {
    expect(parseAccountAccess({ level: "unlimited", source: "parceiro", partner_until: "2026-12-31T23:59:59Z", partner_campaign: "Lançamento" })).toEqual({
      level: "unlimited",
      source: "parceiro",
      partnerUntil: "2026-12-31T23:59:59Z",
      partnerCampaign: "Lançamento",
    });
    expect(parseAccountAccess({ level: "free", source: null, partner_until: null })).toEqual({ level: "free", source: null, partnerUntil: null, partnerCampaign: null });
  });

  it("recusa formatos inesperados", () => {
    expect(parseAccountAccess(null)).toBeNull();
    expect(parseAccountAccess("unlimited")).toBeNull();
    expect(parseAccountAccess({ level: "vip" })).toBeNull();
    expect(parseAccountAccess({ level: "plus", source: "hacker" })?.source).toBeNull();
  });
});

describe("accessLabel", () => {
  const base = { level: "unlimited" as const, partnerUntil: null, partnerCampaign: null };
  it("nomeia cada origem de acesso", () => {
    expect(accessLabel({ ...base, source: "lifetime" })).toBe("Lifetime");
    expect(accessLabel({ ...base, source: "dono" })).toBe("Dono");
    expect(accessLabel({ ...base, level: "plus", source: "plus" })).toBe("Plus");
    expect(accessLabel({ ...base, source: "parceiro", partnerUntil: "2026-12-31T15:00:00Z" })).toBe("Parceiro até 31/12/2026");
  });

  it("Free não tem rótulo", () => {
    expect(accessLabel({ ...base, level: "free", source: null })).toBeNull();
    expect(accessLabel(null)).toBeNull();
  });
});
