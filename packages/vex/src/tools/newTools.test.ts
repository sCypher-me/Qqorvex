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
}));
vi.mock("@qqorvex/database", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  searchEverything: vi.fn(),
}));

import { searchEverything } from "@qqorvex/database";
import { createFlashcard, listNotebooks } from "@qqorvex/module-estudos";
import { listTransactions, updateTransaction } from "@qqorvex/module-financas";
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
