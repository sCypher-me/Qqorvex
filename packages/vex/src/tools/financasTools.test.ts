import { describe, expect, it, vi } from "vitest";
import { createFinancasTools } from "./financasTools";

describe("consulta do mercado de investimentos pela Vex", () => {
  it("usa o mesmo snapshot da tela de investimentos e informa o período das variações", async () => {
    const response = {
      requestedAt: "2026-10-05T12:00:00.000Z",
      apiKeyConfigured: true,
      marketError: null,
      quotes: [],
      market: {
        updatedAt: "2026-10-05T12:00:00.000Z",
        stocks: { gainers: [{ assetType: "stock", symbol: "PETR4", name: "Petrobras PN", price: 38.5, changePercent: 2.5, asOf: null }], decliners: [] },
        fiis: { gainers: [], decliners: [{ assetType: "fii", symbol: "HGLG11", name: "CSHG Logística", price: 155, changePercent: -1.25, asOf: null }] },
        crypto: [{ assetType: "crypto", symbol: "BTC", name: "Bitcoin", price: 600_000, changePercent: 1.1, asOf: null }],
      },
    };
    const invoke = vi.fn().mockResolvedValue({ data: response, error: null });
    const client = { functions: { invoke } } as never;
    const tool = createFinancasTools(client, "user-id").find((item) => item.name === "get_investment_market_overview")!;

    const result = await tool.execute({});

    expect(tool.requiresConfirmation).toBe(false);
    expect(invoke).toHaveBeenCalledWith("investment-quotes", { body: {} });
    expect(result.summary).toContain("PETR4");
    expect(result.summary).toContain("2,50% no último pregão");
    expect(result.summary).toContain("HGLG11");
    expect(result.summary).toContain("BTC");
    expect(result.summary).toContain("em 24 h");
    expect(result.summary).toContain("sem recomendação financeira");
  });
});
