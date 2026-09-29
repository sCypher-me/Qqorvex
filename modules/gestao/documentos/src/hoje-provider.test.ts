import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("./repository", () => ({
  listUpcomingWarranties: vi.fn(async () => []),
  listUpcomingImportantDates: vi.fn(async () => []),
}));

import { createDocumentosHojeProvider } from "./hoje-provider";
import { listUpcomingImportantDates, listUpcomingWarranties } from "./repository";

const client = {} as SupabaseClient<Database>;

describe("createDocumentosHojeProvider", () => {
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

  it("usa o dia local, não o dia em UTC", async () => {
    await createDocumentosHojeProvider(client)();
    expect(listUpcomingWarranties).toHaveBeenCalledWith(client, "2026-09-29", "2026-10-13");
    expect(listUpcomingImportantDates).toHaveBeenCalledWith(client, "2026-09-29", "2026-10-13");
  });
});
