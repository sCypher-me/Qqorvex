import type { LibraryItem, LibraryItemType } from "./types";

/** Rótulos em pt-BR do enum `item_type` — fonte única pro formulário e pra Galeria não divergirem. */
export const LIBRARY_ITEM_TYPE_LABELS: Record<LibraryItemType, string> = {
  book: "Livro",
  comic: "Quadrinho",
  manga: "Mangá",
  movie: "Filme",
  series: "Série",
  anime: "Anime",
  podcast: "Podcast",
  podcast_episode: "Episódio de podcast",
  video: "Vídeo",
  article: "Artigo",
  web_content: "Conteúdo web",
  course: "Curso",
  academic_paper: "Artigo acadêmico",
  game: "Jogo",
  other: "Outro",
};

/** Tipos com busca automática de metadados (Google Books/TMDB) — os demais continuam manuais. */
export const SEARCHABLE_ITEM_TYPES: LibraryItemType[] = ["book", "movie", "series"];

/**
 * "Progresso usa modo, valor atual, total, unidade e percentual derivado quando aplicável."
 * Nunca inventa percentual sem dado suficiente — retorna null nesse caso.
 */
export function computeProgressPercent(item: LibraryItem): number | null {
  if (item.progress_mode === "percentual" && item.progress_current !== null) {
    return Math.min(100, Math.max(0, item.progress_current));
  }
  if (item.progress_mode === "numerico" && item.progress_current !== null && item.progress_total) {
    return Math.round((item.progress_current / item.progress_total) * 100);
  }
  return null;
}

/** Minúsculas + espaços colapsados — não remove acentos (v1 lean, cobre o caso comum de digitar de novo). */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * "Detecção de duplicados" v1 lean: mesmo título normalizado + mesmo tipo, sem ISBN/DOI (o
 * schema não tem esse campo — "evolução futura" no Xmind). Puramente client-side, comparando
 * contra os itens já carregados — diferente de Documentos (hash de arquivo), aqui não há
 * conteúdo binário pra comparar.
 */
export function findDuplicateItem(items: LibraryItem[], title: string, itemType: LibraryItem["item_type"]): LibraryItem | null {
  const normalized = normalizeTitle(title);
  return items.find((item) => item.item_type === itemType && normalizeTitle(item.title) === normalized) ?? null;
}
