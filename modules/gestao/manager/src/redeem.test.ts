import { describe, expect, it } from "vitest";
import { parseRedeemResult } from "./repository";

describe("parseRedeemResult", () => {
  it("Lifetime e Parceiro ativados", () => {
    expect(parseRedeemResult({ ok: true, tier: "lifetime", partner_until: null })).toEqual({ ok: true, tier: "lifetime", partnerUntil: null, partnerCampaign: null });
    expect(parseRedeemResult({ ok: true, tier: "parceiro", partner_until: "2026-12-31T23:59:00Z", partner_campaign: "Lançamento" })).toEqual({
      ok: true,
      tier: "parceiro",
      partnerUntil: "2026-12-31T23:59:00Z",
      partnerCampaign: "Lançamento",
    });
  });

  it("recusa com a mensagem do servidor", () => {
    expect(parseRedeemResult({ ok: false, error: "Código inválido ou já usado." })).toEqual({ ok: false, error: "Código inválido ou já usado." });
  });

  it("formato inesperado vira erro genérico (nunca ativa por engano)", () => {
    expect(parseRedeemResult(null)).toEqual({ ok: false, error: "Não foi possível ativar o código." });
    expect(parseRedeemResult({ ok: true, tier: "vip" })).toEqual({ ok: false, error: "Não foi possível ativar o código." });
    expect(parseRedeemResult("lifetime")).toMatchObject({ ok: false });
  });
});
