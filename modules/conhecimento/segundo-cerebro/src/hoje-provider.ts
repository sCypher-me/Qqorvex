import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listPages } from "./repository";

/**
 * "Segundo Cérebro não precisa de card obrigatório no Hoje... Hoje pode mostrar nota fixada."
 * v1: só páginas favoritadas (equivalente a "fixada"), sem replicar o editor.
 */
export function createSegundoCerebroHojeProvider(client: SupabaseClient<Database>) {
  return async function segundoCerebroHojeProvider(): Promise<HojeItem[]> {
    const pages = await listPages(client);
    return pages
      .filter((page) => page.is_favorite)
      .map((page) => ({
        id: page.id,
        source: "segundo-cerebro",
        title: `Nota: ${page.title}`,
      }));
  };
}
