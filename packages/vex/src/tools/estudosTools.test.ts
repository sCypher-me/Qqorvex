import { describe, expect, it } from "vitest";
import { buildCompleteStudySourceChunks, buildQuizSource, cleanFlashcardDrafts, createEstudosTools } from "./estudosTools";

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

describe("buildCompleteStudySourceChunks", () => {
  it("mantém o conteúdo de todos os resumos mesmo quando precisa dividir em vários trechos", () => {
    const first = "PRIMEIRO_RESUMO ".repeat(30);
    const second = "SEGUNDO_RESUMO ".repeat(30);
    const chunks = buildCompleteStudySourceChunks([
      { title: "Primeiro", content: first },
      { title: "Segundo", content: second },
    ], 300);
    const joined = chunks.join("\n");

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 300)).toBe(true);
    expect(joined.match(/PRIMEIRO_RESUMO/g)).toHaveLength(30);
    expect(joined.match(/SEGUNDO_RESUMO/g)).toHaveLength(30);
    expect(joined).toContain("Resumo: Primeiro");
    expect(joined).toContain("Resumo: Segundo");
  });

  it("ignora somente resumos sem conteúdo e retorna lista vazia quando todos estão vazios", () => {
    expect(buildCompleteStudySourceChunks([{ title: "Vazio", content: " \n " }])).toEqual([]);
  });
});

describe("prévia de criação do resumo", () => {
  it("mostra o destino e o título sem despejar o resumo no chat", () => {
    const tool = createEstudosTools({} as never, "user-id", {} as never).find((item) => item.name === "create_summary_by_notebook_name");
    expect(tool?.preview).toBeTypeOf("function");
    const action = tool!.preview!({ notebookName: "Biologia", title: "Sistema reprodutor", content: "RESUMO COMPLETO E PRIVADO" });
    expect(action.fields).toEqual([
      { label: "Caderno", value: "Biologia" },
      { label: "Título", value: "Sistema reprodutor" },
    ]);
    expect(JSON.stringify(action)).not.toContain("RESUMO COMPLETO E PRIVADO");
    expect(action.note).toContain("depois que você confirmar");
  });
});

describe("prévia de material de estudo completo", () => {
  it("mostra que Quiz e flashcards cobrem o caderno todo antes de qualquer gravação", () => {
    const tool = createEstudosTools({} as never, "user-id", {} as never).find((item) => item.name === "generate_study_materials_by_notebook_name");
    const action = tool!.preview!({ notebookName: "Biologia", materialType: "quiz_e_flashcards" });

    expect(tool?.requiresConfirmation).toBe(true);
    expect(action.fields).toEqual([
      { label: "Caderno", value: "Biologia" },
      { label: "Material", value: "Avaliação (Quiz) e flashcards" },
    ]);
    expect(action.note).toContain("todos os resumos");
    expect(action.note).toContain("Nada será salvo antes");
  });
});
