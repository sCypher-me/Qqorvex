import { describe, expect, it } from "vitest";
import { formatDailyCountdown, getDailyChallenges, localDateKey, shiftLocalDateKey, summarizeDailyChallengeHistory } from "./dailyChallenges";
import type { DailyChallengeProgress } from "./types";

describe("desafios diários", () => {
  it("gera uma composição estável com 2 fáceis, 1 médio e 1 difícil", () => {
    const today = getDailyChallenges("2026-09-22");
    const again = getDailyChallenges("2026-09-22");

    expect(today).toHaveLength(4);
    expect(today.map((challenge) => challenge.key)).toEqual(again.map((challenge) => challenge.key));
    expect(today.filter((challenge) => challenge.difficulty === "Fácil")).toHaveLength(2);
    expect(today.filter((challenge) => challenge.difficulty === "Médio")).toHaveLength(1);
    expect(today.filter((challenge) => challenge.difficulty === "Difícil")).toHaveLength(1);
    expect(today.every((challenge) => challenge.difficulty !== "Especial")).toBe(true);
    expect(new Set(today.map((challenge) => challenge.action)).size).toBe(4);
  });

  it("troca a composição quando a data muda", () => {
    expect(getDailyChallenges("2026-09-22").map((challenge) => challenge.key)).not.toEqual(
      getDailyChallenges("2026-09-23").map((challenge) => challenge.key),
    );
  });

  it("usa a mesma data civil de São Paulo que concede os desafios no banco", () => {
    expect(localDateKey(new Date("2026-09-23T02:59:59.000Z"))).toBe("2026-09-22");
    expect(formatDailyCountdown(new Date("2026-09-23T02:59:59.000Z"))).toBe("00:00:01");
  });

  it("mantém 00h e a aritmética de data local ao atravessar mês, ano e ano bissexto", () => {
    expect(shiftLocalDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftLocalDateKey("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("resume desafios anteriores e só soma o bônus de desafios concluídos", () => {
    const previousDate = "2026-09-21";
    const firstChallenge = getDailyChallenges(previousDate)[0]!;
    const rows = [{
      challenge_date: previousDate,
      challenge_key: firstChallenge.key,
      progress: firstChallenge.target,
      completed_at: "2026-09-21T18:00:00.000Z",
    }] as DailyChallengeProgress[];

    expect(summarizeDailyChallengeHistory("2026-09-22", rows, 1)[0]).toMatchObject({
      dateKey: previousDate,
      completedCount: 1,
      totalCount: 4,
      rewardXp: firstChallenge.rewardXp,
      completedTitles: [firstChallenge.title],
    });
  });

  it("não gera desafios especiais e mantém alvos e recompensas coerentes no ciclo", () => {
    const challenges = Array.from({ length: 60 }, (_, day) => {
      const date = shiftLocalDateKey("2026-09-01", day);
      return getDailyChallenges(date);
    }).flat();
    expect(challenges.every((challenge) => challenge.difficulty !== "Especial")).toBe(true);
    expect(challenges.every((challenge) => challenge.target >= 1 && challenge.target <= 5)).toBe(true);
    expect(challenges.every((challenge) => challenge.rewardXp > 0)).toBe(true);
  });
});
