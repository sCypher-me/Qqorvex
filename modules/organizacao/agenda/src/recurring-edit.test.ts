import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { updateRecurringEvent } from "./repository";
import { toRecurringEventUpdate } from "./service";
import type { RecurringEvent } from "./types";

const series = { id: "r1", next_occurrence_date: "2026-10-06", start_date: "2026-09-01" } as RecurringEvent;
const today = "2026-09-29";

describe("toRecurringEventUpdate", () => {
  it("edita título, horário e frequência sem mexer na âncora se a data não mudou", () => {
    expect(
      toRecurringEventUpdate(series, { title: "Inglês", isAllDay: false, startTime: "19:00:00", endTime: "20:30:00", frequency: "semanal", nextOccurrenceDate: "2026-10-06" }, today),
    ).toEqual({ title: "Inglês", is_all_day: false, start_time: "19:00:00", end_time: "20:30:00", frequency: "semanal", next_occurrence_date: "2026-10-06" });
  });

  it("dia inteiro limpa os horários", () => {
    const update = toRecurringEventUpdate(series, { title: "Plantão", isAllDay: true, startTime: "09:00:00", endTime: "10:00:00", frequency: "semanal", nextOccurrenceDate: "2026-10-06" }, today);
    expect(update).toMatchObject({ is_all_day: true, start_time: null, end_time: null });
  });

  it("recusa término antes do início", () => {
    expect(() => toRecurringEventUpdate(series, { title: "X", isAllDay: false, startTime: "10:00:00", endTime: "09:00:00", frequency: "semanal", nextOccurrenceDate: "2026-10-06" }, today)).toThrow(/término/);
  });

  it("mudar a próxima data move a âncora do dia do mês junto", () => {
    const update = toRecurringEventUpdate(series, { title: "Reunião", isAllDay: false, startTime: "09:00:00", endTime: "10:00:00", frequency: "mensal", nextOccurrenceDate: "2026-10-20" }, today);
    expect(update).toMatchObject({ next_occurrence_date: "2026-10-20", start_date: "2026-10-20" });
  });

  it("recusa mover a próxima data para o passado", () => {
    expect(() => toRecurringEventUpdate(series, { title: "X", isAllDay: true, frequency: "semanal", nextOccurrenceDate: "2026-09-10" }, today)).toThrow(/passado/);
  });

  it("não mexe em descrição, local, link nem folgas (não estão no formulário)", () => {
    const update = toRecurringEventUpdate(series, { title: "X", isAllDay: true, frequency: "semanal", nextOccurrenceDate: "2026-10-06" }, today);
    for (const field of ["description", "location", "meeting_link", "buffer_before_minutes", "buffer_after_minutes", "category", "time_zone"]) {
      expect(update).not.toHaveProperty(field);
    }
  });
});

describe("updateRecurringEvent", () => {
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
    await updateRecurringEvent(fake, series, { title: "Inglês", isAllDay: true, frequency: "semanal", nextOccurrenceDate: "2026-10-06" });
    expect(calls).toContainEqual(["from", "recurring_events"]);
    expect(calls).toContainEqual(["eq", "next_occurrence_date", "2026-10-06"]);
  });

  it("avisa quando a série avançou enquanto a pessoa editava", async () => {
    const { client: fake } = client({ data: null, error: { code: "PGRST116", message: "no rows" } });
    await expect(updateRecurringEvent(fake, series, { title: "X", isAllDay: true, frequency: "semanal", nextOccurrenceDate: "2026-10-06" })).rejects.toThrow(/avançou/);
  });
});
