import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { searchDocumentsByName } from "./repository";

/** Cliente falso que registra a cadeia de filtros montada pela consulta. */
function recordingClient(rows: unknown[] = []) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "ilike", "is", "eq", "limit", "order"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null });
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("searchDocumentsByName", () => {
  it("nunca inclui documentos do Cofre nem da lixeira", async () => {
    const { client, calls } = recordingClient();
    await searchDocumentsByName(client, "passaporte");
    expect(calls).toContainEqual(["from", "documents"]);
    expect(calls).toContainEqual(["eq", "is_vault", false]);
    expect(calls).toContainEqual(["is", "deleted_at", null]);
  });

  it("escapa curingas do termo e respeita o limite", async () => {
    const { client, calls } = recordingClient();
    await searchDocumentsByName(client, "50%_off", 3);
    expect(calls).toContainEqual(["ilike", "file_name", "%50off%"]);
    expect(calls).toContainEqual(["limit", 3]);
  });
});
