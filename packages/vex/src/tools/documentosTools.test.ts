import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("@qqorvex/module-documentos", () => ({
  listDocuments: vi.fn(),
  toggleImportant: vi.fn(async (_client: unknown, id: string, isImportant: boolean) => ({ id, file_name: "passaporte.pdf", is_important: isImportant })),
  uploadDocument: vi.fn(),
}));

import { listDocuments, toggleImportant } from "@qqorvex/module-documentos";
import { createDocumentosTools } from "./documentosTools";

const client = {} as SupabaseClient<Database>;
const toggle = createDocumentosTools(client, "u1").find((tool) => tool.name === "toggle_important_by_name")!;
const passaporte = { id: "d1", file_name: "passaporte.pdf" };

describe("toggle_important_by_name", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca o documento encontrado pelo nome", async () => {
    vi.mocked(listDocuments).mockResolvedValue([passaporte] as never);
    const result = await toggle.execute({ name: "passaporte", isImportant: true });
    expect(result.summary).toMatch(/marcado como importante/);
    expect(toggleImportant).toHaveBeenCalledWith(client, "d1", true);
  });

  it("nunca recebe o PIN do Cofre pela conversa: o parâmetro nem existe", () => {
    expect(Object.keys((toggle.parameters as { properties: object }).properties)).not.toContain("pin");
  });

  it("documento não visível (ex.: Cofre fechado): orienta abrir o Cofre em Documentos, sem pedir o PIN", async () => {
    vi.mocked(listDocuments).mockResolvedValue([] as never);
    const result = await toggle.execute({ name: "passaporte", isImportant: true });
    expect(result.summary).toMatch(/abrir o Cofre em Documentos/);
    expect(result.summary).not.toMatch(/preciso do PIN/);
    expect(toggleImportant).not.toHaveBeenCalled();
  });

  it("nome vazio ou ambíguo nunca altera um documento qualquer", async () => {
    vi.mocked(listDocuments).mockResolvedValue([passaporte, { id: "d2", file_name: "passaporte-antigo.pdf" }] as never);
    expect((await toggle.execute({ name: "", isImportant: true })).summary).toMatch(/Não encontrei/);
    expect((await toggle.execute({ name: "passa", isImportant: true })).summary).toMatch(/mais de um documento/);
    expect(toggleImportant).not.toHaveBeenCalled();
  });
});
