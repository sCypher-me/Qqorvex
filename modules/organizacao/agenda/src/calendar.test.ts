import { describe, expect, it } from "vitest";
import { allDayEventsFor, eventCategory, layoutDayEvents, snapMinutes } from "./calendar";
import type { CalendarEvent } from "./types";

function event(id: string, start: string, end: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id, title: id, start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(), is_all_day: false, ...extra } as CalendarEvent;
}

const day = new Date(2026, 8, 29);

describe("layoutDayEvents", () => {
  it("posiciona eventos sem sobreposição em coluna única", () => {
    const result = layoutDayEvents([event("a", "2026-09-29T09:00", "2026-09-29T10:00"), event("b", "2026-09-29T11:00", "2026-09-29T12:00")], day);
    expect(result.map((item) => [item.event.id, item.startMinute, item.endMinute, item.column, item.columns])).toEqual([
      ["a", 540, 600, 0, 1],
      ["b", 660, 720, 0, 1],
    ]);
  });

  it("coloca eventos simultâneos lado a lado e reaproveita colunas", () => {
    const result = layoutDayEvents(
      [
        event("a", "2026-09-29T09:00", "2026-09-29T11:00"),
        event("b", "2026-09-29T09:30", "2026-09-29T10:00"),
        event("c", "2026-09-29T10:00", "2026-09-29T10:30"),
      ],
      day,
    );
    const byId = Object.fromEntries(result.map((item) => [item.event.id, item]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ column: 1, columns: 2 });
  });

  it("recorta eventos que atravessam a meia-noite", () => {
    const [item] = layoutDayEvents([event("a", "2026-09-28T22:00", "2026-09-29T02:00")], day);
    expect(item).toMatchObject({ startMinute: 0, endMinute: 120, continuesBefore: true, continuesAfter: false });
  });

  it("garante altura mínima para eventos curtos", () => {
    const [item] = layoutDayEvents([event("a", "2026-09-29T09:00", "2026-09-29T09:05")], day);
    expect(item!.endMinute - item!.startMinute).toBe(20);
  });
});

describe("utilitários", () => {
  it("separa eventos de dia inteiro", () => {
    const all = event("x", "2026-09-29T00:00", "2026-09-29T23:59", { is_all_day: true });
    expect(allDayEventsFor([all, event("y", "2026-09-29T09:00", "2026-09-29T10:00")], day).map((e) => e.id)).toEqual(["x"]);
  });

  it("arredonda para o passo da grade", () => {
    expect(snapMinutes(547)).toBe(540);
    expect(snapMinutes(553)).toBe(555);
    expect(snapMinutes(-10)).toBe(0);
  });

  it("reconhece categorias com e sem acento", () => {
    expect(eventCategory("saúde").label).toBe("Saúde");
    expect(eventCategory("reuniao").label).toBe("Reunião");
    expect(eventCategory("viagem").label).toBe("Viagem");
  });
});
