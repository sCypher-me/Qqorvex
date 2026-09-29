import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { updateRecurringTask } from "./repository";
import { toRecurringTaskUpdate } from "./service";
import type { RecurringTask } from "./types";

const series = { id: "r1", next_occurrence_date: "2026-10-05", start_date: "2026-09-05" } as RecurringTask;
const today = "2026-09-29";

describe("toRecurringTaskUpdate", () => {
  it("edita título, prioridade e frequência sem mexer na âncora se a data não mudou", () => {
    expect(toRecurringTaskUpdate(series, { title: "Revisão", priority: "alta", frequency: "semanal", nextOccurrenceDate: "2026-10-05" }, today)).toEqual({
      title: "Revisão",
      priority: "alta",
      frequency: "semanal",
      next_occurrence_date: "2026-10-05",
    });
  });

  it("mudar a próxima data move a âncora do dia do mês junto", () => {
    const update = toRecurringTaskUpdate(series, { title: "Aluguel", priority: "media", frequency: "mensal", nextOccurrenceDate: "2026-10-15" }, today);
    expect(update).toMatchObject({ next_occurrence_date: "2026-10-15", start_date: "2026-10-15" });
  });

  it("recusa mover a próxima data para o passado (geraria ocorrências atrasadas de uma vez)", () => {
    expect(() => toRecurringTaskUpdate(series, { title: "X", priority: "media", frequency: "mensal", nextOccurrenceDate: "2026-09-01" }, today)).toThrow(/passado/);
  });

  it("aceita manter uma data que já estava no passado (série pausada)", () => {
    const paused = { ...series, next_occurrence_date: "2026-08-01" } as RecurringTask;
    expect(() => toRecurringTaskUpdate(paused, { title: "X", priority: "media", frequency: "mensal", nextOccurrenceDate: "2026-08-01" }, today)).not.toThrow();
  });
});

describe("updateRecurringTask", () => {
  function client(result: { data: unknown; error: unknown }) {
    const calls: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["update", "eq", "select", "single"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => void) => resolve(result);
    return { calls, client: { from: (table: string) => (calls.push(["from", table]), builder) } as unknown as SupabaseClient<Database> };
  }

  it("só grava se a série ainda estiver na data que a pessoa abriu", async () => {
    const { client: fake, calls } = client({ data: { id: "r1" }, error: null });
    await updateRecurringTask(fake, series, { title: "Revisão", priority: "alta", frequency: "semanal", nextOccurrenceDate: "2026-10-05" });
    expect(calls).toContainEqual(["from", "recurring_tasks"]);
    expect(calls).toContainEqual(["eq", "id", "r1"]);
    expect(calls).toContainEqual(["eq", "next_occurrence_date", "2026-10-05"]);
  });

  it("avisa quando a série avançou enquanto a pessoa editava", async () => {
    const { client: fake } = client({ data: null, error: { code: "PGRST116", message: "no rows" } });
    await expect(updateRecurringTask(fake, series, { title: "X", priority: "media", frequency: "mensal", nextOccurrenceDate: "2026-10-05" })).rejects.toThrow(/avançou/);
  });
});
