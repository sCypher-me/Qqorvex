/**
 * Hoje não tem dados próprios — cada módulo registra um provider que contribui
 * itens para o resumo do dia. Isso mantém a regra "Hoje é agregador, não fonte
 * de dados" sem Hoje precisar conhecer os internals de Agenda, Tarefas, etc.
 */
export type HojePriority = "informativo" | "atencao" | "importante" | "urgente";

export interface HojeItem {
  id: string;
  /** Nome do módulo de origem (ex.: "tarefas", "agenda"), nunca inventado pelo Hoje. */
  source: string;
  title: string;
  time?: string;
  priority?: HojePriority;
}

export type HojeProvider = () => HojeItem[] | Promise<HojeItem[]>;

export interface HojeSummary {
  items: HojeItem[];
}
