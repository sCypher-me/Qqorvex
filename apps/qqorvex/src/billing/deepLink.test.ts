import { describe, expect, it } from "vitest";
import { parseBillingCheckoutReturn } from "./deepLink";

describe("billing app return deep links", () => {
  it.each([
    ["qqorvex://assinatura?checkout=success", "success"],
    ["qqorvex://assinatura?checkout=cancelled", "cancelled"],
    ["qqorvex://assinatura?checkout=portal_return", "portal_return"],
  ] as const)("accepts the fixed app callback %s", (url, expected) => {
    expect(parseBillingCheckoutReturn(url)).toBe(expected);
  });

  it.each([
    "qqorvex://other?checkout=success",
    "qqorvex://assinatura/other?checkout=success",
    "qqorvex://assinatura?checkout=admin",
    "https://example.com/?checkout=success",
    "not-a-url",
  ])("rejects an unrecognized callback: %s", (url) => {
    expect(parseBillingCheckoutReturn(url)).toBeNull();
  });
});
