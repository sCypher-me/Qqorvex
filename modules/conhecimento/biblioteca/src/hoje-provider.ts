import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listItems } from "./repository";

/**
 * "Biblioteca não precisa lotar o Hoje... Hoje pode mostrar Continuar quando houver item
 * realmente em andamento e relevante." v1: só o item em_andamento atualizado mais recentemente.
 */
export function createBibliotecaHojeProvider(client: SupabaseClient<Database>) {
  return async function bibliotecaHojeProvider(): Promise<HojeItem[]> {
    const items = await listItems(client);
    const inProgress = items.find((item) => item.status === "em_andamento");
    if (!inProgress) return [];
    return [{ id: inProgress.id, source: "biblioteca", title: `Continuar: ${inProgress.title}` }];
  };
}
