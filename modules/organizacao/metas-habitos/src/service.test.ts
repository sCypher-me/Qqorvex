import { describe, expect, it } from "vitest";
import { canBeSubGoal, computeCurrentStreak, computeDerivedProgress, computeHabitStreak, formatHabitStreak, computeMilestoneProgress, getHabitWeeklyTarget, localDateKey, shiftDateKey } from "./service";
import { toGoalInsert } from "./types";
import type { Goal, GoalMilestone, Habit, HabitLog } from "./types";

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

  it("sem registro hoje ou ontem, sequência é 0", () => {
    expect(computeCurrentStreak([], new Date(2026, 8, 15))).toBe(0);
  });

  it("preserva a sequência de ontem até o dia de hoje ser registrado", () => {
    const logs = [log("2026-09-14"), log("2026-09-13")];
    expect(computeCurrentStreak(logs, new Date(2026, 8, 15))).toBe(2);
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

describe("computeHabitStreak", () => {
  function log(date: string, state: HabitLog["state"] = "concluido"): HabitLog {
    return { state, log_date: date } as HabitLog;
  }
  function habit(frequency_type: Habit["frequency_type"], frequency_config: object = {}): Habit {
    return { status: "ativo", frequency_type, frequency_config } as unknown as Habit;
  }

  it("hábito diário mantém a contagem em dias, igual à sequência simples", () => {
    const logs = [log("2026-09-15"), log("2026-09-14"), log("2026-09-13")];
    expect(computeHabitStreak(habit("diaria"), logs, new Date(2026, 8, 15))).toEqual({ count: 3, unit: "dia" });
  });

  it("dias específicos: dias fora da agenda não quebram a sequência", () => {
    // seg 14/09, qua 16/09, sex 18/09 concluídos; referência na sex 18/09.
    const mwf = habit("dias_especificos", { days: ["mon", "wed", "fri"] });
    const logs = [log("2026-09-18"), log("2026-09-16"), log("2026-09-14")];
    expect(computeHabitStreak(mwf, logs, new Date(2026, 8, 18))).toEqual({ count: 3, unit: "vez" });
  });

  it("dias específicos: faltar num dia previsto quebra a sequência", () => {
    const mwf = habit("dias_especificos", { days: ["mon", "wed", "fri"] });
    const logs = [log("2026-09-18"), log("2026-09-14")]; // faltou a qua 16/09
    expect(computeHabitStreak(mwf, logs, new Date(2026, 8, 18))).toEqual({ count: 1, unit: "vez" });
  });

  it("dias específicos: o dia previsto de hoje ainda não registrado não zera a sequência", () => {
    const mwf = habit("dias_especificos", { days: ["mon", "wed", "fri"] });
    const logs = [log("2026-09-16"), log("2026-09-14")];
    expect(computeHabitStreak(mwf, logs, new Date(2026, 8, 18))).toEqual({ count: 2, unit: "vez" });
  });

  it("dias específicos: aceita os códigos antigos em português", () => {
    const legacy = habit("dias_especificos", { days: ["seg", "qua", "sex"] });
    const logs = [log("2026-09-18"), log("2026-09-16"), log("2026-09-14")];
    expect(computeHabitStreak(legacy, logs, new Date(2026, 8, 18)).count).toBe(3);
  });

  it("X vezes por semana conta semanas que bateram a cota; a semana atual não quebra", () => {
    const threeTimes = habit("x_vezes_semana", { timesPerWeek: 3 });
    // Semanas começam no domingo. 06–12/09: 3 vezes; 13–19/09: 3 vezes; 20–26/09 (atual): 1 vez.
    const logs = [
      log("2026-09-07"), log("2026-09-09"), log("2026-09-11"),
      log("2026-09-14"), log("2026-09-15"), log("2026-09-17"),
      log("2026-09-21"),
    ];
    expect(computeHabitStreak(threeTimes, logs, new Date(2026, 8, 22))).toEqual({ count: 2, unit: "semana" });
  });

  it("X vezes por semana: semana passada abaixo da cota quebra a sequência", () => {
    const threeTimes = habit("x_vezes_semana", { timesPerWeek: 3 });
    const logs = [log("2026-09-07"), log("2026-09-09"), log("2026-09-11"), log("2026-09-14")];
    expect(computeHabitStreak(threeTimes, logs, new Date(2026, 8, 22))).toEqual({ count: 0, unit: "semana" });
  });

  it("semanal: a semana atual conta assim que a cota é batida", () => {
    const weekly = habit("semanal");
    const logs = [log("2026-09-21"), log("2026-09-15"), log("2026-09-08")];
    expect(computeHabitStreak(weekly, logs, new Date(2026, 8, 22))).toEqual({ count: 3, unit: "semana" });
  });

  it("mensal conta meses com pelo menos um registro concluído", () => {
    const monthly = habit("mensal");
    const logs = [log("2026-09-02"), log("2026-08-20"), log("2026-06-10")]; // julho ficou vazio
    expect(computeHabitStreak(monthly, logs, new Date(2026, 8, 22))).toEqual({ count: 2, unit: "mes" });
  });

  it("sem nenhum registro concluído a sequência é 0 na unidade do hábito", () => {
    expect(computeHabitStreak(habit("semanal"), [log("2026-09-21", "pulado")], new Date(2026, 8, 22))).toEqual({ count: 0, unit: "semana" });
  });
});

describe("formatHabitStreak", () => {
  it("usa singular, plural e a unidade certa", () => {
    expect(formatHabitStreak({ count: 1, unit: "dia" })).toBe("1 dia seguido");
    expect(formatHabitStreak({ count: 4, unit: "dia" })).toBe("4 dias seguidos");
    expect(formatHabitStreak({ count: 3, unit: "vez" })).toBe("3 vezes seguidas");
    expect(formatHabitStreak({ count: 2, unit: "semana" })).toBe("2 semanas seguidas");
    expect(formatHabitStreak({ count: 1, unit: "mes" })).toBe("1 mês seguido");
  });
});

describe("date helpers", () => {
  it("formata datas como dia local, sem conversão UTC", () => {
    expect(localDateKey(new Date(2026, 8, 15, 0, 15))).toBe("2026-09-15");
  });

  it("desloca corretamente entre meses e anos", () => {
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateKey("2026-09-30", 1)).toBe("2026-10-01");
  });
});

describe("getHabitWeeklyTarget", () => {
  it("usa o número de dias configurados para a frequência personalizada", () => {
    expect(getHabitWeeklyTarget({ frequency_type: "dias_especificos", frequency_config: { days: ["mon", "wed"] } } as unknown as Habit)).toBe(2);
  });

  it("respeita a cota semanal e não inventa um alvo para hábito mensal", () => {
    expect(getHabitWeeklyTarget({ frequency_type: "x_vezes_semana", frequency_config: { timesPerWeek: 3 } } as unknown as Habit)).toBe(3);
    expect(getHabitWeeklyTarget({ frequency_type: "mensal", frequency_config: {} } as unknown as Habit)).toBeNull();
  });
});

describe("goal defaults", () => {
  it("starts new goals active unless the user explicitly leaves them planned", () => {
    expect(toGoalInsert("user-1", { title: "Meta" }).status).toBe("ativa");
    expect(toGoalInsert("user-1", { title: "Meta", status: "planejada" }).status).toBe("planejada");
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
