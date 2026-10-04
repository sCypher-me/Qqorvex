import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchEverything, toSearchResults } from "./search";
import type { Database } from "./types";

function rpcClient(result: { data: unknown; error: unknown }) {
  const calls: unknown[][] = [];
  const client = {
    rpc: async (...args: unknown[]) => {
      calls.push(args);
      return result;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("searchEverything", () => {
  it("não chama o banco com menos de 2 caracteres", async () => {
    const { client, calls } = rpcClient({ data: [], error: null });
    expect(await searchEverything(client, " a ")).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("envia o termo sem espaços nas pontas e o limite por tipo", async () => {
    const { client, calls } = rpcClient({ data: [], error: null });
    await searchEverything(client, "  reuniao ", 3);
    expect(calls).toEqual([["search_everything", { query: "reuniao", per_kind: 3 }]]);
  });

  it("repassa o erro do banco", async () => {
    const { client } = rpcClient({ data: null, error: { message: "falhou" } });
    await expect(searchEverything(client, "reuniao")).rejects.toMatchObject({ message: "falhou" });
  });
});

describe("toSearchResults", () => {
  it("converte para camelCase e descarta tipos que o app não conhece", () => {
    expect(
      toSearchResults([
        { kind: "resumo", id: "s1", title: "Cinemática", snippet: "…aceleração…", parent_id: "n1", sort_date: "2026-09-29T10:00:00Z" },
        { kind: "desconhecido", id: "x", title: "X", snippet: null, parent_id: null, sort_date: null },
      ]),
    ).toEqual([{ kind: "resumo", id: "s1", title: "Cinemática", snippet: "…aceleração…", parentId: "n1", sortDate: "2026-09-29T10:00:00Z" }]);
  });
});
