import { describe, expect, it } from "vitest";
import { BADGE_CATALOG, computeLevel, computeLevelProgress, getTitleForLevel, xpRequiredForLevel } from "./service";

describe("xpRequiredForLevel", () => {
  it("nível 1 exige 0 XP, cada nível seguinte exige mais que o anterior", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(300);
    expect(xpRequiredForLevel(4)).toBe(600);
  });
});

describe("computeLevel", () => {
  it("começa no nível 1 com 0 XP", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("sobe de nível exatamente no XP de corte", () => {
    expect(computeLevel(99)).toBe(1);
    expect(computeLevel(100)).toBe(2);
    expect(computeLevel(299)).toBe(2);
    expect(computeLevel(300)).toBe(3);
  });
});

describe("computeLevelProgress", () => {
  it("calcula progresso percentual dentro do nível atual", () => {
    const progress = computeLevelProgress(150);
    expect(progress.level).toBe(2);
    expect(progress.xpForCurrentLevel).toBe(100);
    expect(progress.xpForNextLevel).toBe(300);
    expect(progress.progressPercent).toBe(25);
  });

  it("0 XP começa em 0%", () => {
    expect(computeLevelProgress(0).progressPercent).toBe(0);
  });
});

describe("getTitleForLevel", () => {
  it("mapeia nível pra título pela faixa mínima", () => {
    expect(getTitleForLevel(1)).toBe("Iniciante");
    expect(getTitleForLevel(4)).toBe("Iniciante");
    expect(getTitleForLevel(5)).toBe("Dedicado");
    expect(getTitleForLevel(9)).toBe("Dedicado");
    expect(getTitleForLevel(10)).toBe("Consistente");
    expect(getTitleForLevel(20)).toBe("Mestre");
    expect(getTitleForLevel(100)).toBe("Mestre");
  });
});

describe("BADGE_CATALOG", () => {
  it("cada badge desbloqueia só quando o contador correspondente bate o limiar", () => {
    const stats = { tasks_completed: 10, habit_or_goal_checkins: 4, quizzes_completed: 3, library_items_completed: 0 };
    const unlocked = BADGE_CATALOG.filter((badge) => badge.isUnlocked(stats as never)).map((badge) => badge.key);
    expect(unlocked).toEqual(["10_tarefas", "3_quizzes"]);
  });
});
