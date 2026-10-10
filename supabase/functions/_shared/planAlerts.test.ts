import { describe, expect, it } from "vitest";
import { selectDayPlanTasks, type Task } from "../../../modules/organizacao/tarefas/src/service";
import { computePlanAlerts, findEventConflicts, isWithinWindow, selectPlanTasks, toWallClock, zoneOffsetMs, type AlertTask } from "./planAlerts";

const day = (hours: number, minutes = 0) => new Date(2026, 9, 10, hours, minutes);
const window = { start: "08:00", end: "21:00" };
const today = "2026-10-10";

function task(id: string, overrides: Partial<AlertTask> = {}): AlertTask {
  return { id, title: id, status: "nao_iniciado", priority: "media", due_date: today, created_at: "2026-10-01T10:00:00Z", estimated_minutes: 60, blocked: false, ...overrides };
}

describe("seleção das tarefas do plano no servidor", () => {
  it("é idêntica à seleção da tela Hoje (selectDayPlanTasks)", () => {
    const tasks = [
      task("feita", { status: "concluido" }),
      task("bloqueada", { blocked: true }),
      task("amanha", { due_date: "2026-10-11" }),
      task("andamento-sem-prazo", { status: "em_andamento", due_date: null }),
      task("atrasada-baixa", { due_date: "2026-10-08", priority: "baixa" }),
      task("hoje-alta", { priority: "alta", created_at: "2026-10-05T10:00:00Z" }),
      task("hoje-alta-antiga", { priority: "alta", created_at: "2026-10-02T10:00:00Z" }),
    ];
    const asApp = tasks.map((item) => ({ ...item, is_cancelled: false, isBlocked: item.blocked }) as unknown as Task & { isBlocked: boolean });
    expect(selectPlanTasks(tasks, today).map((item) => item.id)).toEqual(selectDayPlanTasks(asApp, today).map((item) => item.id));
  });
});

describe("conflitos reais na agenda", () => {
  it("acha só sobreposição de verdade, a partir de agora", () => {
    const events = [
      { id: "a", title: "Reunião", start: day(10), end: day(11) },
      { id: "b", title: "Dentista", start: day(10, 30), end: day(11, 30) },
      { id: "c", title: "Almoço", start: day(11, 30), end: day(12, 30) },
      { id: "d", title: "Antiga", start: day(7), end: day(8) },
      { id: "e", title: "Também antiga", start: day(7, 30), end: day(8, 30) },
    ];
    const conflicts = findEventConflicts(events, day(9));
    expect(conflicts.map(({ first, second }) => `${first.id}-${second.id}`)).toEqual(["a-b"]);
  });
});

describe("avisos do plano do dia", () => {
  it("avisa conflito e prazo em risco uma vez, e não repete o que já foi enviado", () => {
    const input = {
      now: day(19, 0),
      today,
      window,
      tasks: [task("relatorio", { estimated_minutes: 60 }), task("apresentacao", { estimated_minutes: 120, title: "Apresentação" })],
      events: [
        { id: "e1", title: "Call", start: day(19, 30), end: day(20) },
        { id: "e2", title: "Aula", start: day(19, 45), end: day(20, 15) },
      ],
      alreadySent: new Set<string>(),
    };
    const first = computePlanAlerts(input);
    expect(first.map((alert) => alert.title)).toEqual(["Conflito na agenda", "Prazo em risco hoje"]);
    expect(first[0]!.body).toBe("“Call” e “Aula” se sobrepõem às 19:45.");
    expect(first[1]!.body).toContain("“Apresentação”");
    expect(first[1]!.url).toBe("/#plano-do-dia");

    const sent = new Set(first.flatMap((alert) => alert.keys));
    expect(computePlanAlerts({ ...input, alreadySent: sent })).toEqual([]);
  });

  it("volta a avisar só a tarefa que entrou em risco depois", () => {
    const base = { now: day(19, 30), today, window, events: [], alreadySent: new Set([`prazo:${today}:a`]) };
    const alerts = computePlanAlerts({ ...base, tasks: [task("a", { estimated_minutes: 120 }), task("b", { estimated_minutes: 120, title: "Nova" })] });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.keys).toEqual([`prazo:${today}:b`]);
  });

  it("não avisa quando o dia fecha, nem fora do horário disponível", () => {
    const tasks = [task("curta", { estimated_minutes: 30 })];
    expect(computePlanAlerts({ now: day(9), today, window, tasks, events: [], alreadySent: new Set() })).toEqual([]);
    const heavy = [task("enorme", { estimated_minutes: 600 })];
    expect(computePlanAlerts({ now: day(22), today, window, tasks: heavy, events: [], alreadySent: new Set() })).toEqual([]);
    expect(computePlanAlerts({ now: day(7), today, window, tasks: heavy, events: [], alreadySent: new Set() })).toEqual([]);
  });

  it("não conta tarefa sem prazo hoje como prazo em risco", () => {
    const tasks = [task("andamento", { status: "em_andamento", due_date: null, estimated_minutes: 600 })];
    expect(computePlanAlerts({ now: day(19), today, window, tasks, events: [], alreadySent: new Set() })).toEqual([]);
  });
});

describe("relógio de Brasília no servidor", () => {
  it("converte o instante para o relógio de parede do fuso", () => {
    const wall = toWallClock(new Date("2026-10-10T23:30:00Z"), "America/Sao_Paulo");
    expect([wall.getHours(), wall.getMinutes(), wall.getDate()]).toEqual([20, 30, 10]);
    expect(zoneOffsetMs(new Date("2026-10-10T23:30:00Z"), "America/Sao_Paulo")).toBe(-3 * 60 * 60 * 1000);
  });

  it("respeita a janela salva", () => {
    expect(isWithinWindow(day(7, 59), window)).toBe(false);
    expect(isWithinWindow(day(8), window)).toBe(true);
    expect(isWithinWindow(day(20, 59), window)).toBe(true);
    expect(isWithinWindow(day(21), window)).toBe(false);
  });
});
