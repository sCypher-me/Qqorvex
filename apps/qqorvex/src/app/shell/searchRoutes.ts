import type { SearchKind, SearchResult } from "@qqorvex/database";

/** Nome do grupo na paleta, na ordem em que os grupos aparecem. */
export const SEARCH_GROUP_LABEL: Record<SearchKind, string> = {
  tarefa: "Tarefas",
  evento: "Agenda",
  nota: "Notas",
  resumo: "Resumos",
  flashcard: "Flashcards",
  caderno: "Estudos",
  meta: "Metas",
  habito: "Hábitos",
  biblioteca: "Biblioteca",
  documento: "Documentos",
  lancamento: "Finanças",
  ideia: "Ideias",
};

/** Dia civil local (YYYY-MM-DD) de um instante — `toISOString().slice(0, 10)` daria o dia em UTC. */
function localDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Para onde ir ao escolher um resultado da busca global. */
export function searchResultRoute(result: SearchResult): string {
  switch (result.kind) {
    case "tarefa":
      return `/planejar/tarefas?tarefa=${result.id}`;
    case "evento":
      return result.sortDate ? `/planejar/agenda?data=${localDay(result.sortDate)}` : "/planejar/agenda";
    case "nota":
      return `/conhecimento/notas/${result.id}`;
    case "resumo":
      return result.parentId ? `/conhecimento/estudos/${result.parentId}` : "/conhecimento/estudos";
    case "flashcard":
      return result.parentId ? `/conhecimento/estudos/${result.parentId}?aba=cartoes` : "/conhecimento/estudos";
    case "caderno":
      return `/conhecimento/estudos/${result.id}`;
    case "meta":
      return "/planejar/metas?aba=metas";
    case "habito":
      return "/planejar/metas?aba=habitos";
    case "biblioteca":
      return `/conhecimento/biblioteca?item=${result.id}`;
    case "documento":
      return `/vida/documentos?documento=${result.id}`;
    case "lancamento":
      return "/vida/financas?aba=transacoes";
    case "ideia":
      return "/vida/pessoal";
  }
}

/**
 * Apoio visual do resultado: `detail` é o trecho do conteúdo (segunda linha, sob o título) e
 * `hint` é a data curta do evento (à direita).
 */
export function searchResultMeta(result: SearchResult): { detail?: string; hint?: string } {
  return {
    detail: result.snippet ?? undefined,
    hint: result.kind === "evento" && result.sortDate ? new Date(result.sortDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : undefined,
  };
}
