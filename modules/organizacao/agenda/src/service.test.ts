import { describe, expect, it } from "vitest";
import { buildGoogleAuthUrl, computeNextEventOccurrenceDate, findConflicts, findFreeSlots } from "./service";
import type { CalendarEvent } from "./types";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e",
    start_at: "2026-09-15T10:00:00",
    end_at: "2026-09-15T11:00:00",
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    is_all_day: false,
    ...overrides,
  } as CalendarEvent;
}

describe("findConflicts", () => {
  it("detecta sobreposição direta de horário", () => {
    const events = [event({ id: "existing", start_at: "2026-09-15T10:00:00", end_at: "2026-09-15T11:00:00" })];
    const conflicts = findConflicts(events, { startAt: "2026-09-15T10:30:00", endAt: "2026-09-15T11:30:00" });
    expect(conflicts).toHaveLength(1);
  });

  it("buffer conta como parte do horário ocupado", () => {
    const events = [
      event({ id: "existing", start_at: "2026-09-15T10:00:00", end_at: "2026-09-15T11:00:00", buffer_after_minutes: 30 }),
    ];
    const conflicts = findConflicts(events, { startAt: "2026-09-15T11:15:00", endAt: "2026-09-15T12:00:00" });
    expect(conflicts).toHaveLength(1);
  });

  it("ignora eventos de dia inteiro e o próprio evento sendo editado", () => {
    const events = [
      event({ id: "all-day", is_all_day: true, start_at: "2026-09-15T00:00:00", end_at: "2026-09-15T23:59:00" }),
      event({ id: "self", start_at: "2026-09-15T10:00:00", end_at: "2026-09-15T11:00:00" }),
    ];
    const conflicts = findConflicts(events, {
      startAt: "2026-09-15T10:00:00",
      endAt: "2026-09-15T11:00:00",
      excludeEventId: "self",
    });
    expect(conflicts).toHaveLength(0);
  });

  it("sem sobreposição real não conflita", () => {
    const events = [event({ start_at: "2026-09-15T08:00:00", end_at: "2026-09-15T09:00:00" })];
    const conflicts = findConflicts(events, { startAt: "2026-09-15T10:00:00", endAt: "2026-09-15T11:00:00" });
    expect(conflicts).toHaveLength(0);
  });
});

describe("findFreeSlots", () => {
  it("acha o intervalo livre entre dois eventos ocupados", () => {
    const events = [
      event({ start_at: "2026-09-15T09:00:00", end_at: "2026-09-15T10:00:00" }),
      event({ start_at: "2026-09-15T11:00:00", end_at: "2026-09-15T12:00:00" }),
    ];
    const slots = findFreeSlots(events, new Date("2026-09-15T09:00:00"), new Date("2026-09-15T12:00:00"), 30);
    expect(slots).toHaveLength(1);
    expect(slots[0]!.start.toISOString()).toBe(new Date("2026-09-15T10:00:00").toISOString());
    expect(slots[0]!.end.toISOString()).toBe(new Date("2026-09-15T11:00:00").toISOString());
  });

  it("ignora janelas menores que a duração pedida", () => {
    const events = [
      event({ start_at: "2026-09-15T09:00:00", end_at: "2026-09-15T10:00:00" }),
      event({ start_at: "2026-09-15T10:10:00", end_at: "2026-09-15T12:00:00" }),
    ];
    const slots = findFreeSlots(events, new Date("2026-09-15T09:00:00"), new Date("2026-09-15T12:00:00"), 30);
    expect(slots).toHaveLength(0);
  });

  it("sem nenhum evento, o intervalo inteiro é livre", () => {
    const slots = findFreeSlots([], new Date("2026-09-15T09:00:00"), new Date("2026-09-15T12:00:00"), 30);
    expect(slots).toHaveLength(1);
  });
});

describe("buildGoogleAuthUrl", () => {
  it("monta a URL do OAuth do Google com os parâmetros certos", () => {
    const url = buildGoogleAuthUrl({ clientId: "cid", redirectUri: "https://app/callback", state: "tok" });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("cid");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("state")).toBe("tok");
  });
});

describe("computeNextEventOccurrenceDate", () => {
  it("avança pela frequência (diária/semanal/mensal)", () => {
    expect(computeNextEventOccurrenceDate("2026-09-15", "diaria")).toBe("2026-09-16");
    expect(computeNextEventOccurrenceDate("2026-09-15", "semanal")).toBe("2026-09-22");
    expect(computeNextEventOccurrenceDate("2026-09-15", "mensal")).toBe("2026-10-15");
  });
});
