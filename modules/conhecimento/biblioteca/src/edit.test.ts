import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { replaceItemCreators, updateItem } from "./repository";
import { toLibraryItemUpdate } from "./types";

type Call = [string, ...unknown[]];

/**
 * Cliente falso: registra as chamadas por tabela/bucket e responde `select` com as linhas
 * informadas em `rows` (por tabela). Cobre só o que a edição usa.
 */
function fakeClient(rows: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  function table(name: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "update", "insert", "delete", "eq", "order", "single", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([`${name}.${method}`, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => void) => resolve({ data: rows[name] ?? null, error: null });
    return builder;
  }
  const storage = {
    from: (bucket: string) => ({
      upload: async (path: string) => {
        calls.push([`${bucket}.upload`, path]);
        return { data: { path }, error: null };
      },
      remove: async (paths: string[]) => {
        calls.push([`${bucket}.remove`, paths]);
        return { data: null, error: null };
      },
      createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://signed/${path}` }, error: null }),
    }),
  };
  const client = { from: table, storage } as unknown as SupabaseClient<Database>;
  return { client, calls, find: (name: string) => calls.filter((call) => call[0] === name) };
}

const baseInput = { title: "Duna", itemType: "book" as const, tags: ["ficção"] };

describe("toLibraryItemUpdate", () => {
  it("grava os campos do item e limpa os opcionais deixados em branco", () => {
    expect(toLibraryItemUpdate({ title: "Duna", itemType: "book", year: 1965, tags: [] })).toEqual({
      title: "Duna",
      item_type: "book",
      subtitle: null,
      description: null,
      year: 1965,
      origin_url: null,
      tags: [],
    });
  });

  it("não toca em capa, status, progresso nem avaliação", () => {
    const update = toLibraryItemUpdate(baseInput);
    for (const field of ["cover_url", "cover_image_path", "status", "progress_current", "rating"]) {
      expect(update).not.toHaveProperty(field);
    }
  });
});

describe("updateItem", () => {
  it("sem mudança de capa não grava campo de capa (o link assinado nunca volta para o banco)", async () => {
    const { client, find } = fakeClient({ library_items: { id: "i1", cover_image_path: "u/old.png" } });
    await updateItem(client, "u", "i1", baseInput);
    expect(find("library_items.update")).toEqual([["library_items.update", toLibraryItemUpdate(baseInput)]]);
    expect(find("library-covers.remove")).toEqual([]);
  });

  it("trocar para uma URL limpa a imagem enviada e apaga o arquivo antigo", async () => {
    const { client, find } = fakeClient({ library_items: { id: "i1", cover_image_path: "u/old.png" } });
    await updateItem(client, "u", "i1", baseInput, { url: "https://capa/nova.jpg" });
    expect(find("library_items.update")[0]?.[1]).toMatchObject({ cover_url: "https://capa/nova.jpg", cover_image_path: null });
    expect(find("library-covers.remove")).toEqual([["library-covers.remove", ["u/old.png"]]]);
  });

  it("remover a capa zera os dois campos", async () => {
    const { client, find } = fakeClient({ library_items: { id: "i1", cover_image_path: null } });
    await updateItem(client, "u", "i1", baseInput, { url: null });
    expect(find("library_items.update")[0]?.[1]).toMatchObject({ cover_url: null, cover_image_path: null });
    expect(find("library-covers.remove")).toEqual([]);
  });

  it("enviar uma imagem nova sobe o arquivo, aponta para ele e apaga o antigo", async () => {
    const { client, find } = fakeClient({ library_items: { id: "i1", cover_image_path: "u/old.png" } });
    const file = new File(["x"], "capa.png", { type: "image/png" });
    await updateItem(client, "u", "i1", baseInput, { file });
    const uploaded = find("library-covers.upload")[0]?.[1] as string;
    expect(uploaded).toMatch(/^u\/.+\.png$/);
    expect(find("library_items.update")[0]?.[1]).toMatchObject({ cover_image_path: uploaded, cover_url: null });
    expect(find("library-covers.remove")).toEqual([["library-covers.remove", ["u/old.png"]]]);
  });

  it("recusa imagem em formato inválido antes de gravar qualquer coisa", async () => {
    const { client, find } = fakeClient({ library_items: { id: "i1", cover_image_path: null } });
    const file = new File(["x"], "capa.gif", { type: "image/gif" });
    await expect(updateItem(client, "u", "i1", baseInput, { file })).rejects.toThrow(/PNG, JPG ou WebP/);
    expect(find("library_items.update")).toEqual([]);
  });
});

describe("replaceItemCreators", () => {
  it("mantém o papel de quem continua e usa 'criador' para nomes novos", async () => {
    const { client, find } = fakeClient({
      library_item_creators: [
        { name: "Frank Herbert", role: "autor", order_index: 0 },
        { name: "Tradutor Antigo", role: "tradutor", order_index: 1 },
      ],
    });
    await replaceItemCreators(client, "i1", ["Frank Herbert", "Nova Pessoa"]);
    expect(find("library_item_creators.delete")).toHaveLength(1);
    expect(find("library_item_creators.insert")[0]?.[1]).toEqual([
      { item_id: "i1", name: "Frank Herbert", role: "autor", order_index: 0 },
      { item_id: "i1", name: "Nova Pessoa", role: "criador", order_index: 1 },
    ]);
  });

  it("não reescreve nada quando a lista não mudou", async () => {
    const { client, find } = fakeClient({ library_item_creators: [{ name: "Frank Herbert", role: "autor", order_index: 0 }] });
    await replaceItemCreators(client, "i1", ["Frank Herbert"]);
    expect(find("library_item_creators.delete")).toEqual([]);
    expect(find("library_item_creators.insert")).toEqual([]);
  });

  it("lista vazia apaga todos sem inserir", async () => {
    const { client, find } = fakeClient({ library_item_creators: [{ name: "Frank Herbert", role: "autor", order_index: 0 }] });
    await replaceItemCreators(client, "i1", []);
    expect(find("library_item_creators.delete")).toHaveLength(1);
    expect(find("library_item_creators.insert")).toEqual([]);
  });
});
