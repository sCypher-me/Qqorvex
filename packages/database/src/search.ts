import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Tipos de resultado da busca global — um por área do app. */
export const SEARCH_KINDS = ["tarefa", "evento", "nota", "resumo", "flashcard", "caderno", "meta", "habito", "biblioteca", "documento", "lancamento", "ideia"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  /** Trecho em volta do termo quando ele apareceu no conteúdo, não no título. */
  snippet: string | null;
  /** Caderno do resumo/flashcard — as outras áreas não têm pai. */
  parentId: string | null;
  /** Início do evento, data do lançamento ou última edição. */
  sortDate: string | null;
}

/** Termos com menos de 2 caracteres nem vão ao banco (a função também os recusa). */
const SEARCH_MIN_LENGTH = 2;

/**
 * Busca global em títulos e conteúdo, sem acento (`search_everything`, SECURITY INVOKER: as RLS
 * valem e o Cofre nunca aparece). Tipos desconhecidos vindos do banco são descartados em vez de
 * quebrar quem consome.
 */
export async function searchEverything(client: SupabaseClient<Database>, query: string, perKind = 5): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < SEARCH_MIN_LENGTH) return [];
  const { data, error } = await client.rpc("search_everything", { query: term, per_kind: perKind });
  if (error) throw error;
  return toSearchResults(data ?? []);
}

export function toSearchResults(rows: Database["public"]["Functions"]["search_everything"]["Returns"]): SearchResult[] {
  return rows
    .filter((row): row is typeof row & { kind: SearchKind } => (SEARCH_KINDS as readonly string[]).includes(row.kind))
    .map((row) => ({ kind: row.kind, id: row.id, title: row.title, snippet: row.snippet, parentId: row.parent_id, sortDate: row.sort_date }));
}
