import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { renameDocument, renameFolder } from "./repository";
import { normalizeDocumentRename } from "./service";

/** Cliente falso que registra a cadeia de chamadas montada pela consulta. */
function recordingClient() {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "eq", "select", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: { id: "x" }, error: null });
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("normalizeDocumentRename", () => {
  it("nome sem extensão herda a do arquivo atual", () => {
    expect(normalizeDocumentRename("Contrato do aluguel", "contrato.pdf")).toBe("Contrato do aluguel.pdf");
  });

  it("mantém a extensão que a pessoa digitou", () => {
    expect(normalizeDocumentRename("foto-rg.jpg", "IMG_2031.jpeg")).toBe("foto-rg.jpg");
  });

  it("número de versão no nome não conta como extensão", () => {
    expect(normalizeDocumentRename("Relatório v1.2", "relatorio.docx")).toBe("Relatório v1.2.docx");
  });

  it("arquivo atual sem extensão não ganha uma", () => {
    expect(normalizeDocumentRename("Notas", "LEIAME")).toBe("Notas");
  });

  it("troca barras, que viram pastas no caminho das versões no Storage", () => {
    expect(normalizeDocumentRename("IR 2025/2026", "ir.pdf")).toBe("IR 2025-2026.pdf");
    expect(normalizeDocumentRename("a\\b.pdf", "x.pdf")).toBe("a-b.pdf");
  });

  it("limpa espaços e recusa nome vazio", () => {
    expect(normalizeDocumentRename("  Nota   fiscal  ", "nf.pdf")).toBe("Nota fiscal.pdf");
    expect(normalizeDocumentRename("   ", "nf.pdf")).toBeNull();
  });
});

describe("renomear no repositório", () => {
  it("renameDocument muda só o nome exibido (o arquivo no Storage não se move)", async () => {
    const { client, calls } = recordingClient();
    await renameDocument(client, "doc-1", "Contrato.pdf");
    expect(calls).toContainEqual(["from", "documents"]);
    expect(calls).toContainEqual(["update", { file_name: "Contrato.pdf" }]);
    expect(calls).toContainEqual(["eq", "id", "doc-1"]);
  });

  it("renameFolder muda só o nome da pasta", async () => {
    const { client, calls } = recordingClient();
    await renameFolder(client, "folder-1", "Casa");
    expect(calls).toContainEqual(["from", "folders"]);
    expect(calls).toContainEqual(["update", { name: "Casa" }]);
    expect(calls).toContainEqual(["eq", "id", "folder-1"]);
  });
});
