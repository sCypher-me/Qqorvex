import type { SupabaseClient, Database } from "@qqorvex/database";
import { createItem, listItems, updateItemStatus, type LibraryItemStatus } from "@qqorvex/module-biblioteca";
import type { ToolDefinition } from "../types";

/** Ferramentas da Vex para Biblioteca & Conteúdo. Só chamam a API pública de `@qqorvex/module-biblioteca`. */
export function createBibliotecaTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_library_items",
      description: "Lista os itens da Biblioteca do usuário",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const items = await listItems(client);
        if (items.length === 0) return { summary: "Sua Biblioteca está vazia." };
        const lines = items.map((i) => `- [${i.status}] ${i.title}`).join("\n");
        return { summary: `Sua Biblioteca:\n${lines}`, data: items };
      },
    },
    {
      name: "add_library_item",
      description: "Adiciona um item à Biblioteca (livro, filme, curso, etc.)",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui adicionar o item: título vazio." };
        const item = await createItem(client, userId, { title });
        return { summary: `Adicionado à Biblioteca: "${item.title}".`, data: item };
      },
    },
    {
      name: "update_library_item_status_by_title",
      description: "Atualiza o status de um item da Biblioteca (quero_consumir/em_andamento/concluido/pausado/abandonado) pelo título",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título (ou parte dele) do item" },
          status: {
            type: "string",
            enum: ["quero_consumir", "em_andamento", "concluido", "pausado", "abandonado"],
          },
        },
        required: ["title", "status"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.title ?? "")
          .trim()
          .toLowerCase();
        const items = await listItems(client);
        const match = items.find((i) => i.title.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhum item parecido com "${args.title}".` };
        const updated = await updateItemStatus(client, match.id, args.status as LibraryItemStatus);
        return { summary: `Item "${updated.title}" atualizado para status "${updated.status}".`, data: updated };
      },
    },
  ];
}
