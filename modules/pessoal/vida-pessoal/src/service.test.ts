import { describe, expect, it } from "vitest";
import { computePlanLabel, computePlanPeriod, countCompletedPomodorosThisWeek, countCompletedPomodorosToday } from "./service";
import type { PomodoroSession } from "./types";

function session(overrides: Partial<PomodoroSession>): PomodoroSession {
  return { status: "completed", started_at: "2026-09-15T10:00:00Z", ...overrides } as PomodoroSession;
}

describe("computePlanLabel", () => {
  it("plano mensal mostra 'Mês Ano'", () => {
    expect(computePlanLabel({ plan_type: "mensal", period_start: "2026-09-01", period_end: "2026-09-30" })).toBe("Setembro 2026");
  });

  it("plano anual mostra só o ano", () => {
    expect(computePlanLabel({ plan_type: "anual", period_start: "2026-01-01", period_end: "2026-12-31" })).toBe("2026");
  });

  it("plano quinquenal mostra intervalo de anos, inclusive virando a década", () => {
    expect(computePlanLabel({ plan_type: "quinquenal", period_start: "2026-01-01", period_end: "2030-12-31" })).toBe("2026–2030");
  });
});

describe("computePlanPeriod", () => {
  it("mensal deriva do primeiro ao último dia do mês", () => {
    expect(computePlanPeriod("mensal", { month: "2026-02" })).toEqual({ periodStart: "2026-02-01", periodEnd: "2026-02-28" });
  });

  it("mensal em dezembro não estoura pro ano seguinte", () => {
    expect(computePlanPeriod("mensal", { month: "2026-12" })).toEqual({ periodStart: "2026-12-01", periodEnd: "2026-12-31" });
  });

  it("anual cobre o ano inteiro", () => {
    expect(computePlanPeriod("anual", { year: 2026 })).toEqual({ periodStart: "2026-01-01", periodEnd: "2026-12-31" });
  });

  it("quinquenal cobre 5 anos (ano + 4)", () => {
    expect(computePlanPeriod("quinquenal", { year: 2026 })).toEqual({ periodStart: "2026-01-01", periodEnd: "2030-12-31" });
  });
});

describe("countCompletedPomodorosToday", () => {
  it("conta só sessões completed do mesmo dia local", () => {
    const reference = new Date(2026, 8, 15, 20, 0);
    const sessions = [
      session({ status: "completed", started_at: new Date(2026, 8, 15, 9, 0).toISOString() }),
      session({ status: "died", started_at: new Date(2026, 8, 15, 10, 0).toISOString() }),
      session({ status: "completed", started_at: new Date(2026, 8, 14, 23, 0).toISOString() }),
    ];
    expect(countCompletedPomodorosToday(sessions, reference)).toBe(1);
  });
});

describe("countCompletedPomodorosThisWeek", () => {
  it("conta sessões completed desde o início da semana (domingo)", () => {
    const reference = new Date(2026, 8, 16); // quarta-feira
    const sessions = [
      session({ status: "completed", started_at: new Date(2026, 8, 13).toISOString() }), // domingo desta semana
      session({ status: "completed", started_at: new Date(2026, 8, 12).toISOString() }), // sábado da semana anterior
      session({ status: "died", started_at: new Date(2026, 8, 15).toISOString() }),
    ];
    expect(countCompletedPomodorosThisWeek(sessions, reference)).toBe(1);
  });
});
