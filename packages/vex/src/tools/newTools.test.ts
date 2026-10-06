import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("@qqorvex/module-financas", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listTransactions: vi.fn(),
  updateTransaction: vi.fn(async (_client: unknown, id: string, input: object) => ({ id, ...input })),
}));
vi.mock("@qqorvex/module-estudos", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listNotebooks: vi.fn(),
  createFlashcard: vi.fn(async (_client: unknown, notebookId: string, input: { front: string; back: string }) => ({ id: "f1", notebook_id: notebookId, ...input })),
  createFlashcards: vi.fn(async () => []),
  createQuiz: vi.fn(async (_client: unknown, notebookId: string, title: string, questions: unknown[]) => ({ id: "q1", notebook_id: notebookId, title, questions })),
  listSummaries: vi.fn(),
}));
vi.mock("@qqorvex/database", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchEverything: vi.fn(),
}));

import { searchEverything } from "@qqorvex/database";
import { createFlashcard, createFlashcards, createQuiz, listNotebooks, listSummaries } from "@qqorvex/module-estudos";
import { listTransactions, updateTransaction } from "@qqorvex/module-financas";
import { confirmVexToolCall, runVexTurn } from "../core/runVexTurn";
import { rescheduleEvent } from "./agendaTools";
import { createBuscaTools } from "./buscaTools";
import { createEstudosTools } from "./estudosTools";
import { createFinancasTools } from "./financasTools";
import type { ToolDefinition, VexProvider } from "../types";

const client = {} as SupabaseClient<Database>;
const tool = (tools: ToolDefinition[], name: string) => tools.find((item) => item.name === name)!;

describe("rescheduleEvent", () => {
  beforeEach(() => vi.stubEnv("TZ", "America/Sao_Paulo"));
  afterEach(() => vi.unstubAllEnvs());

  // 14:00–15:30 em Brasília.
  const timed = { start_at: "2026-10-02T17:00:00Z", end_at: "2026-10-02T18:30:00Z", is_all_day: false };

  it("mudar só a data mantém horário e duração", () => {
    const result = rescheduleEvent(timed, { date: "2026-10-05" });
    expect(result).toEqual({ allDay: false, start: new Date(2026, 9, 5, 14, 0), end: new Date(2026, 9, 5, 15, 30) });
  });

  it("mudar só o início mantém a duração", () => {
    expect(rescheduleEvent(timed, { startTime: "09:00" })).toEqual({ allDay: false, start: new Date(2026, 9, 2, 9, 0), end: new Date(2026, 9, 2, 10, 30) });
  });

  it("dia inteiro continua dia inteiro, a não ser que venha um horário", () => {
    const allDay = { start_at: "2026-10-02T03:00:00Z", end_at: "2026-10-03T03:00:00Z", is_all_day: true };
    expect(rescheduleEvent(allDay, { date: "2026-10-09" })).toEqual({ allDay: true, start: new Date(2026, 9, 9), end: new Date(2026, 9, 10) });
    expect(rescheduleEvent(allDay, { startTime: "10:00" })).toEqual({ allDay: false, start: new Date(2026, 9, 2, 10, 0), end: new Date(2026, 9, 2, 11, 0) });
  });

  it("recusa término antes do início", () => {
    expect(rescheduleEvent(timed, { startTime: "16:00", endTime: "15:00" })).toEqual({ error: "o término precisa ser depois do início" });
  });
});

describe("update_transaction_by_name", () => {
  const update = tool(createFinancasTools(client, "u1"), "update_transaction_by_name");
  const internet = { id: "t1", name: "Internet", amount: 120, date: "2026-09-10", category_id: "cat-casa", status: "concluido" };

  beforeEach(() => vi.mocked(updateTransaction).mockClear());

  it("muda só o valor e repassa categoria e situação atuais (senão seriam apagadas)", async () => {
    vi.mocked(listTransactions).mockResolvedValue([internet] as never);
    await update.execute({ name: "internet", amount: 99.9 });
    expect(updateTransaction).toHaveBeenCalledWith(client, "t1", { name: "Internet", amount: 99.9, date: "2026-09-10", categoryId: "cat-casa", status: "concluido" });
  });

  it("com dois lançamentos parecidos, pergunta qual em vez de adivinhar", async () => {
    vi.mocked(listTransactions).mockResolvedValue([internet, { ...internet, id: "t2", name: "Internet celular" }] as never);
    const result = await update.execute({ name: "net", amount: 50 });
    expect(result.summary).toMatch(/Pergunte à pessoa/);
    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it("sem nada para mudar, não grava", async () => {
    vi.mocked(listTransactions).mockResolvedValue([internet] as never);
    const result = await update.execute({ name: "internet" });
    expect(result.summary).toMatch(/diga o que mudar/);
    expect(updateTransaction).not.toHaveBeenCalled();
  });
});

describe("create_flashcard_by_notebook_name", () => {
  const create = tool(createEstudosTools(client, "u1", {} as VexProvider), "create_flashcard_by_notebook_name");

  beforeEach(() => vi.mocked(createFlashcard).mockClear());

  it("cria no caderno certo", async () => {
    vi.mocked(listNotebooks).mockResolvedValue([{ id: "n1", name: "Física" }] as never);
    await create.execute({ notebookName: "fisica", front: "O que é inércia?", back: "Tendência de manter o estado de movimento." });
    expect(createFlashcard).toHaveBeenCalledWith(client, "n1", { front: "O que é inércia?", back: "Tendência de manter o estado de movimento." });
  });

  it("com dois cadernos parecidos, pergunta qual", async () => {
    vi.mocked(listNotebooks).mockResolvedValue([{ id: "n1", name: "Física 1" }, { id: "n2", name: "Física 2" }] as never);
    const result = await create.execute({ notebookName: "física", front: "A", back: "B" });
    expect(result.summary).toMatch(/Pergunte à pessoa/);
    expect(createFlashcard).not.toHaveBeenCalled();
  });
});

describe("generate_study_materials_by_notebook_name", () => {
  const request = "Crie uma avaliação e flashcards com todos os resumos do caderno Biologia";
  const generatedChunk = (chunk: number) => JSON.stringify({
    questions: Array.from({ length: 5 }, (_, index) => ({
      questionText: `Pergunta ${index + 1}`,
      options: ["A", "B", "C", "D"],
      correctOptionIndex: index % 4,
    })),
    flashcards: [{ front: `Conceito ${chunk}`, back: "Explicação" }],
  });

  beforeEach(() => {
    vi.mocked(createFlashcards).mockClear();
    vi.mocked(createQuiz).mockClear();
  });

  it("só consulta os resumos depois do pedido, processa todos os trechos e salva após confirmação", async () => {
    vi.mocked(listNotebooks).mockResolvedValue([{ id: "n1", name: "Biologia" }] as never);
    vi.mocked(listSummaries).mockResolvedValue([
      { id: "s1", title: "Células", content: `MARCADOR_CELULAS ${"célula ".repeat(1_100)}` },
      { id: "s2", title: "Genética", content: `MARCADOR_GENETICA ${"gene ".repeat(1_500)}` },
    ] as never);
    let sourceCalls = 0;
    const provider: VexProvider = {
      name: "scripted-study",
      async chat({ messages, tools }) {
        if (tools.length > 0) return { kind: "tool_call", toolCall: { name: "generate_study_materials_by_notebook_name", arguments: { notebookName: "Biologia", materialType: "quiz_e_flashcards" } } };
        if (messages.at(-1)?.role === "tool") return { kind: "message", content: "Material criado." };
        sourceCalls += 1;
        return { kind: "message", content: generatedChunk(sourceCalls) };
      },
    };
    const tools = createEstudosTools(client, "u1", provider);
    const proposal = await runVexTurn({ provider, messages: [{ role: "user", content: request }], tools });

    expect(proposal.kind).toBe("confirmation_required");
    expect(listSummaries).not.toHaveBeenCalled();
    expect(createQuiz).not.toHaveBeenCalled();
    expect(createFlashcards).not.toHaveBeenCalled();
    if (proposal.kind !== "confirmation_required") return;

    const result = await confirmVexToolCall({
      provider,
      messages: [{ role: "user", content: request }],
      tools,
      tool: proposal.tool,
      args: proposal.toolCall.arguments,
    });

    expect(result.kind).toBe("message");
    expect(sourceCalls).toBe(2);
    expect(createQuiz).toHaveBeenCalledWith(client, "n1", "Avaliação completa — Biologia", expect.arrayContaining([
      expect.objectContaining({ questionText: "Pergunta 1" }),
    ]));
    expect(vi.mocked(createQuiz).mock.calls[0]?.[3]).toHaveLength(10);
    expect(createFlashcards).toHaveBeenCalledWith(client, "n1", [
      { front: "Conceito 1", back: "Explicação" },
      { front: "Conceito 2", back: "Explicação" },
    ]);
  });

  it("marca falha se o provedor de contingência não gerar conteúdo válido, sem salvar", async () => {
    vi.mocked(listNotebooks).mockResolvedValue([{ id: "n1", name: "Biologia" }] as never);
    vi.mocked(listSummaries).mockResolvedValue([{ id: "s1", title: "Células", content: "Biologia celular" }] as never);
    const provider: VexProvider = { name: "fallback", async chat() { return { kind: "message", content: "Não consegui acessar a IA. Ainda não criei nada." }; } };
    const action = tool(createEstudosTools(client, "u1", provider), "generate_study_materials_by_notebook_name");

    const result = await action.execute({ notebookName: "Biologia", materialType: "quiz_e_flashcards" });

    expect(result.ok).toBe(false);
    expect(result.summary).toContain("Nada foi salvo");
    expect(createQuiz).not.toHaveBeenCalled();
    expect(createFlashcards).not.toHaveBeenCalled();
  });
});

describe("search_everything", () => {
  const search = tool(createBuscaTools(client), "search_everything");

  it("lista cada resultado com o tipo e o trecho", async () => {
    vi.mocked(searchEverything).mockResolvedValue([
      { kind: "nota", id: "p1", title: "Planejamento", snippet: "…Reunião com o time…", parentId: null, sortDate: null },
      { kind: "tarefa", id: "t1", title: "Preparar reunião", snippet: null, parentId: null, sortDate: null },
    ]);
    const result = await search.execute({ query: "reuniao" });
    expect(result.summary).toBe('Resultados para "reuniao":\n- [Nota] Planejamento — …Reunião com o time…\n- [Tarefa] Preparar reunião');
  });

  it("termo curto não consulta nada", async () => {
    vi.mocked(searchEverything).mockClear();
    const result = await search.execute({ query: "a" });
    expect(result.summary).toMatch(/pelo menos 2 caracteres/);
    expect(searchEverything).not.toHaveBeenCalled();
  });
});
