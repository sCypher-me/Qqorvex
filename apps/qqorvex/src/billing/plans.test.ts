import { describe, expect, it } from "vitest";
import { BILLING_PLANS, currentBillingMonthSaoPaulo } from "./plans";
import { billingLimitMessage } from "@qqorvex/database";

describe("billing plans", () => {
  it("mantém o valor anual com aproximadamente 10% de desconto", () => {
    const regularAnnualPrice = BILLING_PLANS.plus.monthlyPrice * 12;
    const discount = 1 - BILLING_PLANS.plus.annualPrice / regularAnnualPrice;
    expect(discount).toBeCloseTo(0.1, 2);
    expect(BILLING_PLANS.plus.annualPrice).toBe(214.9);
  });

  it("mantém os limites generosos aprovados e todos os módulos no Free", () => {
    expect(BILLING_PLANS.free).toMatchObject({
      goals: 5,
      habits: 10,
      notebooks: 5,
      mindMaps: 5,
      vexInteractions: 50,
      webSearches: 10,
      documentStorageBytes: 25 * 1024 * 1024,
      maxDocumentFileBytes: 10 * 1024 * 1024,
    });
    expect(BILLING_PLANS.plus).toMatchObject({
      goals: null,
      habits: null,
      notebooks: null,
      mindMaps: null,
      vexInteractions: 300,
      webSearches: 60,
      documentStorageBytes: 100 * 1024 * 1024,
      maxDocumentFileBytes: 50 * 1024 * 1024,
    });
  });

  it("converte erros de limite em orientação sem sugerir que dados foram apagados", () => {
    expect(billingLimitMessage({ message: "QQORVEX_LIMIT:habits:10" })).toContain("10 hábitos ativos");
    expect(billingLimitMessage({ message: "QQORVEX_LIMIT:habits:10" })).toContain("continua acessível");
    expect(billingLimitMessage({ message: "23505" })).toBeNull();
  });

  it("calcula o mês no fuso de cobrança de São Paulo", () => {
    expect(currentBillingMonthSaoPaulo(new Date("2026-10-01T02:30:00.000Z"))).toBe("2026-09-01");
  });
});
