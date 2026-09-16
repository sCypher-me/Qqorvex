import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Biblioteca & Conteúdo é fonte de verdade de itens, status/progresso de consumo, avaliações,
 * ciclos, coleções, histórico e relações internas entre conteúdos. Metadata Provider Layer
 * (Google Books + TMDB) implementado — ver docs/decisions/biblioteca-metadata-provider-design.md.
 * v1 lean: sem conteúdo episódico estruturado, sem detecção de duplicados/mesclagem (a detecção
 * em si já existe, "mesclagem" que não) e sem Insights/Retrospectiva — "evolução futura" no
 * Xmind ou dependentes de mais infraestrutura.
 */
export type LibraryItem = Tables<"library_items">;
export type LibraryItemType = LibraryItem["item_type"];
export type LibraryItemStatus = LibraryItem["status"];
export type LibraryItemCreator = Tables<"library_item_creators">;
export type LibraryConsumptionCycle = Tables<"library_consumption_cycles">;
export type LibraryCollection = Tables<"library_collections">;
export type LibraryItemRelation = Tables<"library_item_relations">;

export interface NewLibraryItemInput {
  title: string;
  itemType?: LibraryItemType;
  subtitle?: string;
  description?: string;
  year?: number;
  coverUrl?: string;
  originUrl?: string;
}

export function toLibraryItemInsert(userId: string, input: NewLibraryItemInput): TablesInsert<"library_items"> {
  return {
    user_id: userId,
    title: input.title,
    item_type: input.itemType ?? "other",
    subtitle: input.subtitle ?? null,
    description: input.description ?? null,
    year: input.year ?? null,
    cover_url: input.coverUrl ?? null,
    origin_url: input.originUrl ?? null,
  };
}
