import { describe, expect, it } from "vitest";
import { buildQuizSource, cleanFlashcardDrafts } from "./estudosTools";

describe("buildQuizSource", () => {
  it("junta título e conteúdo dos resumos", () => {
    expect(buildQuizSource([{ title: "Mitose", content: "Divisão celular." }, { title: "Meiose", content: "Gera gametas." }])).toBe(
      "Mitose\nDivisão celular.\n\nMeiose\nGera gametas.",
    );
  });

  it("para no limite sem cortar um resumo no meio (cabe na mensagem da vex-chat)", () => {
    const summaries = [
      { title: "A", content: "x".repeat(40) },
      { title: "B", content: "y".repeat(40) },
    ];
    expect(buildQuizSource(summaries, 60)).toBe(`A\n${"x".repeat(40)}`);
  });

  it("um resumo maior que o limite entra truncado (ainda dá para gerar o quiz)", () => {
    expect(buildQuizSource([{ title: "Longo", content: "z".repeat(100) }], 20)).toHaveLength(20);
  });

  it("ignora resumos vazios", () => {
    expect(buildQuizSource([{ title: " ", content: " " }])).toBe("");
  });
});

describe("cleanFlashcardDrafts", () => {
  it("mantém só os que têm frente e verso, sem frentes repetidas", () => {
    expect(
      cleanFlashcardDrafts([
        { front: " O que é mitose? ", back: " Divisão celular " },
        { front: "o que é mitose?", back: "duplicado" },
        { front: "Sem verso", back: "" },
        "texto solto",
        null,
      ]),
    ).toEqual([{ front: "O que é mitose?", back: "Divisão celular" }]);
  });

  it("limita a 20 por chamada e aceita formatos inesperados sem quebrar", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ front: `F${index}`, back: `B${index}` }));
    expect(cleanFlashcardDrafts(many)).toHaveLength(20);
    expect(cleanFlashcardDrafts(undefined)).toEqual([]);
    expect(cleanFlashcardDrafts({ front: "a", back: "b" })).toEqual([]);
  });
});
