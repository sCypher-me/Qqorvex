import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addItemCreator,
  createItem,
  listItems,
  searchLibraryMetadata,
  selectBestLibraryMetadata,
  updateItemStatus,
  type LibraryItemStatus,
  type LibraryItemType,
} from "@qqorvex/module-biblioteca";
import type { ToolDefinition } from "../types";

/** Ferramentas da Vex para Biblioteca & Conteúdo. Só chamam a API pública de `@qqorvex/module-biblioteca`. */
export interface BibliotecaToolOptions {
  tmdbApiKey?: string;
}

const LIBRARY_ITEM_TYPES: LibraryItemType[] = [
  "book",
  "comic",
  "manga",
  "movie",
  "series",
  "anime",
  "podcast",
  "podcast_episode",
  "video",
  "article",
  "web_content",
  "course",
  "academic_paper",
  "game",
  "other",
];

export function createBibliotecaTools(client: SupabaseClient<Database>, userId: string, options: BibliotecaToolOptions = {}): ToolDefinition[] {
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
      description: "Adiciona um item à Biblioteca. Informe itemType quando souber; livros, filmes, séries e animes recebem capa e metadados automaticamente quando houver uma correspondência segura.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          itemType: { type: "string", enum: LIBRARY_ITEM_TYPES },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui adicionar o item: título vazio." };
        const itemType = String(args.itemType ?? "other") as LibraryItemType;
        const candidates = LIBRARY_ITEM_TYPES.includes(itemType) && ["book", "movie", "series", "anime"].includes(itemType)
          ? await searchLibraryMetadata(title, itemType, options.tmdbApiKey).catch(() => [])
          : [];
        const metadata = selectBestLibraryMetadata(title, candidates);
        const item = await createItem(client, userId, metadata
          ? {
              title: metadata.title || title,
              itemType,
              subtitle: metadata.subtitle,
              description: metadata.description,
              year: metadata.year,
              coverUrl: metadata.coverUrl,
              originUrl: metadata.originUrl,
            }
          : { title, itemType });

        if (metadata?.creators) {
          for (let index = 0; index < metadata.creators.length; index++) {
            const creator = metadata.creators[index]!;
            await addItemCreator(client, item.id, creator.name, creator.role, index);
          }
        }

        const metadataNote = metadata
          ? " Encontrei uma correspondência segura e preenchi a capa e os metadados automaticamente."
          : ["book", "movie", "series", "anime"].includes(itemType)
            ? " Não encontrei uma correspondência segura; o item foi criado sem capa para você revisar manualmente."
            : " Você pode adicionar uma capa e outros detalhes manualmente pela Biblioteca.";
        return { summary: `Adicionado à Biblioteca: "${item.title}".${metadataNote}`, data: item };
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
