import type { HojeProvider, HojeSummary } from "./types";

const providers = new Set<HojeProvider>();
export const HOJE_REGISTRY_CHANGE_EVENT = "qqorvex:hoje-registry-change";

function notifyRegistryChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HOJE_REGISTRY_CHANGE_EVENT));
  }
}

/**
 * Chamado pela API pública de um módulo (ex.: `modules/organizacao/tarefas`) para
 * contribuir itens ao resumo do dia. Hoje nunca importa esses módulos diretamente.
 */
export function registerHojeProvider(provider: HojeProvider): () => void {
  providers.add(provider);
  notifyRegistryChanged();
  return () => {
    if (providers.delete(provider)) notifyRegistryChanged();
  };
}

export async function getHojeSummary(): Promise<HojeSummary> {
  const results = await Promise.allSettled([...providers].map((provider) => provider()));
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return { items };
}
