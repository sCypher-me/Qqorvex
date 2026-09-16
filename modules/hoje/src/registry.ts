import type { HojeProvider, HojeSummary } from "./types";

const providers = new Set<HojeProvider>();

/**
 * Chamado pela API pública de um módulo (ex.: `modules/organizacao/tarefas`) para
 * contribuir itens ao resumo do dia. Hoje nunca importa esses módulos diretamente.
 */
export function registerHojeProvider(provider: HojeProvider): () => void {
  providers.add(provider);
  return () => providers.delete(provider);
}

export async function getHojeSummary(): Promise<HojeSummary> {
  const results = await Promise.all([...providers].map((provider) => provider()));
  const items = results.flat().sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return { items };
}
