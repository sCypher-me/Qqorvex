import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("./repository", () => ({
  listTransactions: vi.fn(async () => [
    { id: "t1", name: "Internet", amount: 100, transaction_type: "saida", status: "futura", date: "2026-09-29" },
  ]),
}));

import { createFinancasHojeProvider } from "./hoje-provider";

const client = {} as SupabaseClient<Database>;

describe("createFinancasHojeProvider", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "America/Sao_Paulo");
    vi.useFakeTimers();
    // 29/09 às 23:30 em Brasília — em UTC já é 30/09.
    vi.setSystemTime(new Date("2026-09-30T02:30:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("mostra a cobrança que vence hoje no dia local", async () => {
    const items = await createFinancasHojeProvider(client)();
    expect(items.map((item) => item.id)).toContain("t1");
  });
});
