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
export const SEARCHABLE_ITEM_TYPES: LibraryItemType[] = ["book", "movie", "series", "anime"];

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

/* ───────────── Estante em fileiras (estilo streaming) ───────────── */

export type ShelfVariant = "continue" | "poster";

export interface LibraryShelf {
  key: string;
  title: string;
  /** "continue" = cartão largo com progresso e +1; "poster" = capa vertical. */
  variant: ShelfVariant;
  items: LibraryItem[];
}

export interface LibraryFeatured {
  item: LibraryItem;
  /** "continuar" = último em andamento; "comecar" = sem nada em andamento, o primeiro da fila. */
  kind: "continuar" | "comecar";
}

/** Grupos de tipo para as fileiras por tipo — a ordem aqui é a ordem na tela. */
const TYPE_GROUPS: Array<{ key: string; title: string; types: LibraryItemType[] }> = [
  { key: "tipo-leitura", title: "Leitura", types: ["book", "comic", "manga"] },
  { key: "tipo-tela", title: "Filmes e séries", types: ["movie", "series", "anime", "video"] },
  { key: "tipo-cursos", title: "Cursos", types: ["course"] },
  { key: "tipo-audio", title: "Áudio", types: ["podcast", "podcast_episode"] },
  { key: "tipo-jogos", title: "Jogos", types: ["game"] },
  { key: "tipo-artigos", title: "Artigos", types: ["article", "web_content", "academic_paper"] },
];

const RECENT_DONE_LIMIT = 10;
const MIN_TYPE_SHELF_ITEMS = 2;

function byRecent(a: LibraryItem, b: LibraryItem): number {
  return b.updated_at.localeCompare(a.updated_at);
}

/**
 * Página principal da Biblioteca em fileiras: um destaque e, na ordem, Continuar, Retomar
 * (pausados), Na fila, Concluídos recentemente (até 10), Favoritos e uma fileira por grupo de tipo
 * com 2 itens ou mais. O destaque não se repete na fileira de onde saiu; fileiras vazias somem.
 * Abandonados não entram em fileira nenhuma (continuam na busca e nos filtros).
 */
export function buildLibraryShelves(items: LibraryItem[]): { featured: LibraryFeatured | null; shelves: LibraryShelf[] } {
  const sorted = [...items].sort(byRecent);
  const inProgress = sorted.filter((item) => item.status === "em_andamento");
  const queue = sorted.filter((item) => item.status === "quero_consumir");
  const featured: LibraryFeatured | null = inProgress[0]
    ? { item: inProgress[0], kind: "continuar" }
    : queue[0]
      ? { item: queue[0], kind: "comecar" }
      : null;
  const notFeatured = (item: LibraryItem) => item.id !== featured?.item.id;

  const shelves: LibraryShelf[] = [
    { key: "continuar", title: "Continuar", variant: "continue", items: inProgress.filter(notFeatured) },
    { key: "retomar", title: "Retomar", variant: "continue", items: sorted.filter((item) => item.status === "pausado") },
    { key: "fila", title: "Na fila", variant: "poster", items: queue.filter(notFeatured) },
    { key: "concluidos", title: "Concluídos recentemente", variant: "poster", items: sorted.filter((item) => item.status === "concluido").slice(0, RECENT_DONE_LIMIT) },
    { key: "favoritos", title: "Favoritos", variant: "poster", items: sorted.filter((item) => item.is_favorite) },
    ...TYPE_GROUPS.map((group) => ({
      key: group.key,
      title: group.title,
      variant: "poster" as const,
      items: sorted.filter((item) => item.status !== "abandonado" && group.types.includes(item.item_type)),
    })).filter((shelf) => shelf.items.length >= MIN_TYPE_SHELF_ITEMS),
  ];
  return { featured, shelves: shelves.filter((shelf) => shelf.items.length > 0) };
}

/** Unidades em que faz mais sentido dizer "o próximo" do que "quanto falta". */
const NEXT_UNIT_SINGULAR: Record<string, string> = { episódios: "episódio", capítulos: "capítulo", aulas: "aula" };

function singularUnit(unit: string): string {
  return NEXT_UNIT_SINGULAR[unit] ?? unit.replace(/s$/, "");
}

/** "Faltam 428 páginas", "Próximo: episódio 7", "62% concluído", "Terminado" — ou null sem progresso. */
export function remainingText(item: LibraryItem): string | null {
  if (item.progress_mode === "percentual" && item.progress_current !== null) return `${Math.round(item.progress_current)}% concluído`;
  if (item.progress_mode !== "numerico" || item.progress_current === null) return null;
  const unit = item.progress_unit ?? "";
  if (!item.progress_total) return `Parou em ${item.progress_current}${unit ? ` ${unit}` : ""}`;
  if (item.progress_current >= item.progress_total) return "Terminado";
  if (NEXT_UNIT_SINGULAR[unit]) return `Próximo: ${NEXT_UNIT_SINGULAR[unit]} ${item.progress_current + 1}`;
  const left = item.progress_total - item.progress_current;
  if (!unit) return `Faltam ${left}`;
  return left === 1 ? `Falta 1 ${singularUnit(unit)}` : `Faltam ${left} ${unit}`;
}

const STEP_LABEL: Record<string, string> = { páginas: "pág.", episódios: "ep.", capítulos: "cap.", aulas: "aula" };

export interface ProgressStep {
  /** Texto do botão: "+1 pág.", "+1 ep.", "+10 min", "+5%". */
  label: string;
  /** O passo leva ao fim (100% ou ao total) — a tela oferece "Marcar concluído". */
  finished: boolean;
  progress: { mode: "numerico" | "percentual"; current: number; total?: number; unit?: string };
}

/**
 * O "+1" rápido da faixa Continuar e do Hoje: +1 na unidade do item (+10 em minutos), +5% no modo
 * percentual, sem passar do total. `null` quando não há progresso registrado ou o item já está no
 * fim — aí a tela oferece "Registrar" em vez do +1.
 */
export function nextProgressStep(item: LibraryItem): ProgressStep | null {
  if (item.progress_mode === "percentual") {
    const current = item.progress_current ?? 0;
    if (current >= 100) return null;
    const next = Math.min(100, current + 5);
    return { label: "+5%", finished: next >= 100, progress: { mode: "percentual", current: next } };
  }
  if (item.progress_mode !== "numerico") return null;
  const current = item.progress_current ?? 0;
  const total = item.progress_total ?? undefined;
  if (total !== undefined && current >= total) return null;
  const unit = item.progress_unit ?? undefined;
  const amount = unit === "minutos" ? 10 : 1;
  const next = total === undefined ? current + amount : Math.min(total, current + amount);
  const label = unit === "minutos" ? "+10 min" : `+1${unit && STEP_LABEL[unit] ? ` ${STEP_LABEL[unit]}` : ""}`;
  return { label, finished: total !== undefined && next >= total, progress: { mode: "numerico", current: next, total, unit } };
}
