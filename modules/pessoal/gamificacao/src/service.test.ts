import { describe, expect, it } from "vitest";
import { BADGE_CATALOG, computeLevel, computeLevelProgress, getTitleForLevel, xpRequiredForLevel } from "./service";
import { SPECIAL_BADGE_CATALOG, getLatestUnlockedSubscriptionTenureKey, getSubscriptionTenureBadge } from "./specialBadges";

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

  it("mantém o nível 50 como o corte usado pela conta do proprietário", () => {
    expect(xpRequiredForLevel(50)).toBe(122_500);
    expect(computeLevel(122_499)).toBe(49);
    expect(computeLevel(122_500)).toBe(50);
  });

  it("resolve grandes contadores sem percorrer milhões de níveis", () => {
    const level = computeLevel(Number.MAX_SAFE_INTEGER);
    expect(xpRequiredForLevel(level)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    expect(xpRequiredForLevel(level + 1)).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
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

  it("normaliza XP inválido sem quebrar a progressão", () => {
    expect(computeLevel(-10)).toBe(1);
    expect(computeLevelProgress(-10)).toMatchObject({ xp: 0, level: 1, progressPercent: 0 });
    expect(computeLevelProgress(Number.NaN)).toMatchObject({ xp: 0, level: 1, progressPercent: 0 });
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
    const stats = {
      tasks_completed: 150,
      habit_or_goal_checkins: 0,
      quizzes_completed: 0,
      library_items_completed: 0,
      checkin_days_completed: 30,
      quizzes_90_plus: 50,
    };
    const unlocked = BADGE_CATALOG.filter((badge) => badge.isUnlocked?.(stats as never)).map((badge) => badge.key);
    expect(unlocked).toEqual(["150_tarefas", "30_checkin_days", "50_quizzes_90_plus"]);
  });
});

describe("SPECIAL_BADGE_CATALOG", () => {
  it("mantém todos os badges especiais atuais sem chaves duplicadas", () => {
    const keys = SPECIAL_BADGE_CATALOG.map((badge) => badge.key);

    expect(keys).toHaveLength(55);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("dono");
    expect(keys).toContain("vip_plus");
    expect(keys).toContain("assinatura_50_meses");
  });

  it("usa uma arte mensal consistente e mantém cada marco de assinatura identificável", () => {
    const tenureBadges = SPECIAL_BADGE_CATALOG.filter((badge) => badge.access === "subscription_tenure");

    expect(tenureBadges).toHaveLength(50);
    expect(tenureBadges.map((badge) => badge.subscriptionMonths)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(new Set(tenureBadges.map((badge) => badge.imageSrc))).toEqual(new Set(["/brand/badges/tempo-assinatura/tenure-v2.png"]));
  });

  it("seleciona o maior marco de assinatura já alcançado", () => {
    expect(getSubscriptionTenureBadge(0)).toBeNull();
    expect(getSubscriptionTenureBadge(3)?.key).toBe("assinatura_03_meses");
    expect(getSubscriptionTenureBadge(999)?.key).toBe("assinatura_50_meses");
  });

  it("mantém somente o maior badge de tempo de assinatura na conta", () => {
    expect(getLatestUnlockedSubscriptionTenureKey(["assinatura_01_meses", "assinatura_02_meses"])).toBe("assinatura_02_meses");
    expect(getLatestUnlockedSubscriptionTenureKey(["150_tarefas", "assinatura_10_meses", "assinatura_03_meses"])).toBe("assinatura_10_meses");
    expect(getLatestUnlockedSubscriptionTenureKey(["150_tarefas"])).toBeNull();
  });
});
