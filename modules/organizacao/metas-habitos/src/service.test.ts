import { describe, expect, it } from "vitest";
import { canBeSubGoal, computeCurrentStreak, computeDerivedProgress, computeMilestoneProgress } from "./service";
import type { Goal, GoalMilestone, HabitLog } from "./types";

describe("canBeSubGoal", () => {
  it("sem pai candidato não pode ser submeta", () => {
    expect(canBeSubGoal(undefined)).toBe(false);
  });

  it("só permite profundidade 2 (submeta não pode ter pai que já é submeta)", () => {
    expect(canBeSubGoal({ parent_goal_id: null } as Goal)).toBe(true);
    expect(canBeSubGoal({ parent_goal_id: "x" } as Goal)).toBe(false);
  });
});

describe("computeMilestoneProgress", () => {
  it("sem marcos retorna null (não inventa progresso)", () => {
    expect(computeMilestoneProgress([])).toBeNull();
  });

  it("calcula percentual de marcos concluídos", () => {
    const milestones = [{ is_done: true }, { is_done: true }, { is_done: false }, { is_done: false }] as GoalMilestone[];
    expect(computeMilestoneProgress(milestones)).toBe(50);
  });
});

describe("computeCurrentStreak", () => {
  function log(date: string): HabitLog {
    return { state: "concluido", log_date: date } as HabitLog;
  }

  it("sem registro na data de referência, sequência é 0", () => {
    expect(computeCurrentStreak([], new Date(2026, 8, 15))).toBe(0);
  });

  it("conta dias consecutivos concluídos terminando na referência", () => {
    const logs = [log("2026-09-15"), log("2026-09-14"), log("2026-09-13"), log("2026-09-11")];
    expect(computeCurrentStreak(logs, new Date(2026, 8, 15))).toBe(3);
  });

  it("um dia sem registro corta a sequência mesmo com dias mais antigos concluídos", () => {
    const logs = [log("2026-09-15"), log("2026-09-13")];
    expect(computeCurrentStreak(logs, new Date(2026, 8, 15))).toBe(1);
  });
});

describe("computeDerivedProgress", () => {
  it("alvo zero ou negativo não tem percentual sensato — 0%", () => {
    expect(computeDerivedProgress(500, 0)).toBe(0);
    expect(computeDerivedProgress(500, -10)).toBe(0);
  });

  it("satura em 100% mesmo passando do alvo", () => {
    expect(computeDerivedProgress(2000, 1000)).toBe(100);
  });

  it("nunca fica negativo com saldo negativo", () => {
    expect(computeDerivedProgress(-100, 1000)).toBe(0);
  });

  it("calcula o percentual normal dentro da faixa", () => {
    expect(computeDerivedProgress(250, 1000)).toBe(25);
  });
});
