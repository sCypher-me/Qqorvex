import { describe, expect, it } from "vitest";
import { isFlexibleEvent, proposeReorganization, type ReorgEvent, type ReorgTask } from "./dayReorganize";

const day = (hours: number, minutes = 0, date = 10) => new Date(2026, 9, date, hours, minutes);
const window = { start: "08:00", end: "21:00" };
const base = { window, tomorrow: "2026-10-11" };
const task = (id: string, minutes: number, dueDate: string | null = "2026-10-10"): ReorgTask => ({ id, title: id, estimatedMinutes: minutes, mustFinishToday: dueDate !== null && dueDate <= "2026-10-10", dueDate });
const event = (id: string, start: Date, end: Date, flexible: boolean): ReorgEvent => ({ id, title: id, start, end, flexible });
const clock = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}${date.getDate() !== 10 ? " (amanhã)" : ""}`;

describe("compromissos flexíveis", () => {
  it("só blocos que a pessoa marca para si podem mudar sem combinar com ninguém", () => {
    expect(isFlexibleEvent({ category: "foco" })).toBe(true);
    expect(isFlexibleEvent({ category: "estudos" })).toBe(true);
    expect(isFlexibleEvent({ category: "pessoal", location: "Bistrô Central" })).toBe(false);
    expect(isFlexibleEvent({ category: "estudos", meeting_link: "https://meet.google.com/x" })).toBe(false);
    expect(isFlexibleEvent({ category: "reuniao" })).toBe(false);
    expect(isFlexibleEvent({ category: "foco", is_all_day: true })).toBe(false);
  });
});

describe("proposta de reorganização", () => {
  it("resolve conflito movendo o bloco flexível para o próximo horário livre de hoje", () => {
    const result = proposeReorganization({
      ...base,
      now: day(9),
      tasks: [],
      events: [event("reuniao", day(10), day(11), false), event("foco", day(10, 30), day(11, 30), true)],
    });
    expect(result.changes).toHaveLength(1);
    const change = result.changes[0]!;
    expect(change.kind === "event_move" && [change.id, clock(change.to.start), clock(change.to.end), change.reason]).toEqual(["foco", "09:00", "10:00", "conflito"]);
    expect(result.unresolvedConflicts).toEqual([]);
  });

  it("não mexe em conflito entre compromissos com outras pessoas: só avisa", () => {
    const result = proposeReorganization({
      ...base,
      now: day(9),
      tasks: [],
      events: [event("cliente", day(10), day(11), false), event("dentista", day(10, 30), day(11, 30), false)],
    });
    expect(result.changes).toEqual([]);
    expect(result.unresolvedConflicts.map(({ first, second }) => [first.id, second.id])).toEqual([["cliente", "dentista"]]);
  });

  it("adia blocos flexíveis antes de mexer em prazos quando o dia não fecha", () => {
    const result = proposeReorganization({
      ...base,
      now: day(17),
      tasks: [task("relatorio", 120)],
      events: [event("estudo", day(17), day(19), true), event("academia", day(19), day(20), false)],
    });
    expect(result.changes.map((change) => [change.kind, change.id])).toEqual([["event_move", "estudo"]]);
    const move = result.changes[0]!;
    expect(move.kind === "event_move" && clock(move.to.start)).toBe("17:00 (amanhã)");
    expect(result.planAfter.status).toBe("cabe");
  });

  it("passa para amanhã só o prazo que ainda não cabe depois de liberar o que dava", () => {
    const result = proposeReorganization({
      ...base,
      now: day(19),
      tasks: [task("curta", 30), task("enorme", 300), task("sem-prazo", 120, null)],
      events: [event("cliente", day(20), day(20, 30), false)],
    });
    expect(result.changes).toEqual([{ kind: "task_due", id: "enorme", title: "enorme", from: "2026-10-10", to: "2026-10-11" }]);
  });

  it("depois do horário disponível só sugere prazos, sem mover compromissos", () => {
    const result = proposeReorganization({
      ...base,
      now: day(21, 30),
      tasks: [task("atrasada", 60, "2026-10-08")],
      events: [event("foco", day(21, 40), day(22), true), event("outro", day(21, 45), day(22, 15), true)],
    });
    expect(result.changes).toEqual([{ kind: "task_due", id: "atrasada", title: "atrasada", from: "2026-10-08", to: "2026-10-11" }]);
  });
});
