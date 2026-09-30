import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("./repository", () => ({
  getCheckinForDate: vi.fn(async () => null),
  listVehicles: vi.fn(async () => [{ id: "v1", nickname: "Carro" }]),
  listAllVehicleImportantDates: vi.fn(async () => [{ id: "d1", vehicle_id: "v1", label: "IPVA", date: "2026-09-29" }]),
}));

import { createVidaPessoalHojeProvider } from "./hoje-provider";
import { getCheckinForDate } from "./repository";

const client = {} as SupabaseClient<Database>;

describe("createVidaPessoalHojeProvider", () => {
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

  it("procura o check-in do dia local e ainda mostra o que vence hoje", async () => {
    const items = await createVidaPessoalHojeProvider(client)();
    expect(getCheckinForDate).toHaveBeenCalledWith(client, "2026-09-29");
    expect(items.map((item) => item.title)).toContain("IPVA (Carro)");
  });
});
