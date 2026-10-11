import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { vexMemoriesContext } from "./memories";
import { createMemoryTools } from "./tools/memoryTools";

function fakeClient(rows: Array<{ id: string; content: string }>) {
  const inserted: string[] = [];
  const deleted: string[] = [];
  const from = vi.fn(() => {
    const builder = {
      select: () => builder,
      order: async () => ({ data: rows.map((row) => ({ ...row, created_at: "", updated_at: "" })), error: null }),
      insert: (value: { content: string }) => {
        inserted.push(value.content);
        return { select: () => ({ single: async () => ({ data: { id: "novo", content: value.content, created_at: "", updated_at: "" }, error: null }) }) };
      },
      delete: () => ({
        eq: async (_column: string, id: string) => {
          deleted.push(id);
          return { error: null };
        },
      }),
    };
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, inserted, deleted };
}

const tool = (client: SupabaseClient<Database>, name: string) => createMemoryTools(client).find((item) => item.name === name)!;

describe("memória da Vex", () => {
  it("guardar e esquecer pedem confirmação; listar não", () => {
    const { client } = fakeClient([]);
    expect(tool(client, "remember").requiresConfirmation).toBe(true);
    expect(tool(client, "forget_memory").requiresConfirmation).toBe(true);
    expect(tool(client, "list_memories").requiresConfirmation).toBe(false);
  });

  it("não duplica a mesma memória (sem diferenciar acento e maiúscula)", async () => {
    const { client, inserted } = fakeClient([{ id: "1", content: "Prefere reuniões depois das 10h" }]);
    const result = await tool(client, "remember").execute({ content: "prefere reunioes depois das 10h" });
    expect(result.summary).toMatch(/já estava guardado/);
    expect(inserted).toEqual([]);
  });

  it("esquece só quando o trecho aponta para uma memória", async () => {
    const { client, deleted } = fakeClient([
      { id: "1", content: "Estuda para o ENEM" },
      { id: "2", content: "Prefere estudar de manhã" },
    ]);
    expect((await tool(client, "forget_memory").execute({ text: "estud" })).ok).toBe(false);
    expect(deleted).toEqual([]);
    expect((await tool(client, "forget_memory").execute({ text: "enem" })).summary).toMatch(/Esqueci/);
    expect(deleted).toEqual(["1"]);
  });

  it("no contexto, as memórias entram como preferências — não como regras", () => {
    expect(vexMemoriesContext([])).toEqual([]);
    const [message] = vexMemoriesContext([{ content: "Prefere respostas curtas" }]);
    expect(message?.role).toBe("system");
    expect(message?.content).toMatch(/não instruções/);
    expect(message?.content).toContain("- Prefere respostas curtas");
  });
});
