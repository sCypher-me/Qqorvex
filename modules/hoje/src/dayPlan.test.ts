import { describe, expect, it } from "vitest";
import { buildDayPlan, defaultTaskMinutes, isClosingTime, normalizeDayWindow, validateDayWindow, type PlanTaskInput } from "./dayPlan";

const day = (hours: number, minutes = 0) => new Date(2026, 9, 10, hours, minutes);
const task = (id: string, estimatedMinutes: number | null, mustFinishToday = true): PlanTaskInput => ({ id, title: id, estimatedMinutes, mustFinishToday });
const event = (id: string, start: Date, end: Date) => ({ id, title: id, start, end });
const window = { start: "08:00", end: "21:00" };
const clock = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

describe("buildDayPlan", () => {
  it("encaixa as tarefas na ordem recebida, a partir de agora, com pausa de 25% depois de cada uma", () => {
    const plan = buildDayPlan({ now: day(9, 2), window, tasks: [task("relatorio", 60), task("emails", 20)], events: [] });
    const blocks = plan.entries.map((entry) => `${entry.kind}:${clock(entry.start)}-${clock(entry.end)}`);
    expect(blocks).toEqual(["task:09:05-10:05", "pause:10:05-10:20", "task:10:20-10:40", "pause:10:40-10:45"]);
    expect(plan.status).toBe("cabe");
    expect(plan.plannedMinutes).toBe(80);
    expect(clock(plan.finishesAt!)).toBe("10:40");
  });

  it("começa no início da janela quando ainda é cedo e respeita os compromissos fixos", () => {
    const plan = buildDayPlan({
      now: day(6, 30),
      window,
      tasks: [task("relatorio", 60), task("emails", 30)],
      events: [event("reuniao", day(8, 30), day(10, 0))],
    });
    const tasks = plan.entries.filter((entry) => entry.kind === "task").map((entry) => `${entry.id}@${clock(entry.start)}`);
    // 08:00–08:30 não comporta 1 h + pausa; os e-mails (30 min + 10 de pausa) também não cabem nos 30 min antes da reunião.
    expect(tasks).toEqual(["relatorio@10:00", "emails@11:15"]);
    expect(plan.entries.some((entry) => entry.kind === "event" && entry.id === "reuniao")).toBe(true);
  });

  it("aproveita um intervalo curto anterior para uma tarefa pequena", () => {
    const plan = buildDayPlan({
      now: day(8, 0),
      window,
      tasks: [task("longa", 90), task("curta", 15)],
      events: [event("reuniao", day(8, 30), day(9, 0))],
    });
    const starts = Object.fromEntries(plan.entries.filter((entry) => entry.kind === "task").map((entry) => [entry.id, clock(entry.start)]));
    expect(starts).toEqual({ longa: "09:00", curta: "08:00" });
  });

  it("divide uma tarefa longa entre os intervalos quando nenhum sozinho comporta", () => {
    const plan = buildDayPlan({
      now: day(9, 0),
      window: { start: "09:00", end: "13:00" },
      tasks: [task("projeto", 120)],
      events: [event("a", day(10, 15), day(10, 30)), event("b", day(11, 45), day(12, 0))],
    });
    const parts = plan.entries.filter((entry) => entry.kind === "task");
    expect(parts.map((entry) => entry.minutes).reduce((sum, value) => sum + value, 0)).toBe(120);
    expect(parts.every((entry) => entry.kind === "task" && entry.part?.total === parts.length)).toBe(true);
    expect(plan.status).toBe("cabe");
  });

  it("aponta o que não cabe e quanto falta quando o dia não fecha", () => {
    const plan = buildDayPlan({
      now: day(19, 0),
      window,
      tasks: [task("relatorio", 60), task("apresentacao", 90), task("ler", 30, false)],
      events: [],
    });
    expect(plan.status).toBe("nao_cabe");
    expect(plan.entries.filter((entry) => entry.kind === "task").map((entry) => entry.id)).toEqual(["relatorio", "ler"]);
    expect(plan.overflow.map((item) => item.id)).toEqual(["apresentacao"]);
    expect(plan.shortfallMinutes).toBe(90 + 25);
  });

  it("não diz que o dia não fecha quando só ficam de fora tarefas sem prazo para hoje", () => {
    const plan = buildDayPlan({
      now: day(20, 0),
      window,
      tasks: [task("relatorio", 30), task("portfolio", 120, false)],
      events: [],
    });
    expect(plan.status).toBe("cabe");
    expect(plan.overflow.map((item) => item.id)).toEqual(["portfolio"]);
    expect(plan.shortfallMinutes).toBe(0);
  });

  it("usa a duração padrão nas tarefas sem estimativa e marca como estimada", () => {
    const plan = buildDayPlan({ now: day(9, 0), window, tasks: [task("sem-estimativa", null)], events: [], defaultMinutes: 45 });
    const entry = plan.entries.find((item) => item.kind === "task");
    expect(entry).toMatchObject({ minutes: 45, estimated: true });
  });

  it("encerra o plano depois do fim da janela, sem empurrar nada sozinho", () => {
    const plan = buildDayPlan({ now: day(21, 30), window, tasks: [task("relatorio", 60)], events: [] });
    expect(plan.status).toBe("encerrado");
    expect(plan.entries).toEqual([]);
    expect(plan.overflow.map((item) => item.id)).toEqual(["relatorio"]);
  });

  it("calcula o tempo livre sem contar compromissos sobrepostos duas vezes", () => {
    const plan = buildDayPlan({
      now: day(9, 0),
      window: { start: "09:00", end: "12:00" },
      tasks: [],
      events: [event("a", day(9, 30), day(10, 30)), event("b", day(10, 0), day(11, 0))],
    });
    expect(plan.freeMinutes).toBe(30 + 60);
    expect(plan.status).toBe("sem_tarefas");
  });
});

describe("janela de disponibilidade", () => {
  it("usa 08:00–21:00 por padrão e rejeita janelas inválidas ou curtas", () => {
    expect(normalizeDayWindow(undefined)).toEqual({ start: "08:00", end: "21:00" });
    expect(normalizeDayWindow({ start: "07:30", end: "18:00" })).toEqual({ start: "07:30", end: "18:00" });
    expect(normalizeDayWindow({ start: "18:00", end: "18:30" })).toEqual({ start: "08:00", end: "21:00" });
    expect(normalizeDayWindow({ start: "25:00", end: "18:00" })).toEqual({ start: "08:00", end: "21:00" });
    expect(validateDayWindow({ start: "09:00", end: "09:45" })).toMatch(/1 hora/);
    expect(validateDayWindow({ start: "09:00", end: "17:00" })).toBeNull();
  });

  it("convida para fechar o dia só na última hora da janela (e logo depois)", () => {
    expect(isClosingTime(day(19, 59), window)).toBe(false);
    expect(isClosingTime(day(20, 0), window)).toBe(true);
    expect(isClosingTime(day(22, 30), window)).toBe(true);
    expect(isClosingTime(new Date(2026, 9, 11, 0, 30), window)).toBe(false);
    expect(isClosingTime(day(12, 0), window)).toBe(false);
  });
});

describe("defaultTaskMinutes", () => {
  it("aprende com as estimativas que a pessoa já deu e fica entre 15 min e 2 h", () => {
    expect(defaultTaskMinutes([])).toBe(30);
    expect(defaultTaskMinutes([20, 40, 60])).toBe(40);
    expect(defaultTaskMinutes([5, 5, 10])).toBe(15);
    expect(defaultTaskMinutes([240, 300])).toBe(120);
  });
});
