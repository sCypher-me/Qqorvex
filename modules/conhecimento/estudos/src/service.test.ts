import { describe, expect, it } from "vitest";
import { canBeSubTopic, computeNextReview, computeQuizScore, parseGeneratedQuiz } from "./service";
import type { Topic } from "./types";

describe("canBeSubTopic", () => {
  it("sem pai candidato não pode ser subtópico", () => {
    expect(canBeSubTopic(undefined)).toBe(false);
  });

  it("só pode ser subtópico de um tópico principal (sem pai ele mesmo)", () => {
    expect(canBeSubTopic({ parent_topic_id: null } as Topic)).toBe(true);
    expect(canBeSubTopic({ parent_topic_id: "x" } as Topic)).toBe(false);
  });
});

describe("computeNextReview (SM-2 simplificado)", () => {
  const base = { interval_days: 6, ease_factor: 2.5, repetitions: 2 };
  const today = new Date("2026-09-15");

  it("errar zera repetições, intervalo de 1 dia e reduz o ease factor", () => {
    const result = computeNextReview(base, "errei", today);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeCloseTo(2.3);
    expect(result.nextReviewDate).toBe("2026-09-16");
  });

  it("1ª repetição de acerto usa intervalo de 1 dia, 2ª usa 6 dias", () => {
    const first = computeNextReview({ interval_days: 0, ease_factor: 2.5, repetitions: 0 }, "bom", today);
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);

    const second = computeNextReview({ interval_days: 1, ease_factor: 2.5, repetitions: 1 }, "bom", today);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
  });

  it("da 3ª repetição em diante, intervalo cresce pelo ease factor", () => {
    const result = computeNextReview(base, "bom", today);
    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBe(Math.round(6 * 2.5));
  });

  it("ease factor nunca cai abaixo do mínimo (1.3)", () => {
    const result = computeNextReview({ interval_days: 1, ease_factor: 1.35, repetitions: 0 }, "errei", today);
    expect(result.easeFactor).toBe(1.3);
  });
});

describe("parseGeneratedQuiz", () => {
  const validQuestion = { questionText: "2+2?", options: ["1", "2", "3", "4"], correctOptionIndex: 3 };
  const fiveValid = Array(5).fill(validQuestion);

  it("aceita array puro com exatamente 5 perguntas válidas", () => {
    expect(parseGeneratedQuiz(JSON.stringify(fiveValid))).toEqual(fiveValid);
  });

  it("aceita envelope { questions: [...] }", () => {
    expect(parseGeneratedQuiz(JSON.stringify({ questions: fiveValid }))).toEqual(fiveValid);
  });

  it("rejeita JSON inválido", () => {
    expect(parseGeneratedQuiz("{not json")).toBeNull();
  });

  it("rejeita quando não tem exatamente 5 perguntas", () => {
    expect(parseGeneratedQuiz(JSON.stringify(fiveValid.slice(0, 4)))).toBeNull();
  });

  it("rejeita pergunta com menos de 4 opções ou índice de resposta fora de faixa", () => {
    const badOptions = [...fiveValid.slice(0, 4), { ...validQuestion, options: ["1", "2"] }];
    expect(parseGeneratedQuiz(JSON.stringify(badOptions))).toBeNull();

    const badIndex = [...fiveValid.slice(0, 4), { ...validQuestion, correctOptionIndex: 9 }];
    expect(parseGeneratedQuiz(JSON.stringify(badIndex))).toBeNull();
  });
});

describe("computeQuizScore", () => {
  it("conta acertos comparando respostas com o gabarito na mesma ordem", () => {
    const questions = [{ correct_option_index: 0 }, { correct_option_index: 1 }, { correct_option_index: 2 }];
    expect(computeQuizScore(questions, [0, 1, 2])).toBe(3);
    expect(computeQuizScore(questions, [0, 0, 0])).toBe(1);
    expect(computeQuizScore(questions, [])).toBe(0);
  });
});
