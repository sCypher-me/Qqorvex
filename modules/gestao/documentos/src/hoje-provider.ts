import type { SupabaseClient, Database } from "@qqorvex/database";
import { localDateKey, localDateKeyInDays, type HojeItem } from "@qqorvex/module-hoje";
import { listUpcomingImportantDates, listUpcomingWarranties } from "./repository";

/**
 * "Hoje pode mostrar: garantias próximas do fim, contratos próximos de renovação/término,
 * documentos importantes com lembrete." v1: garantias e datas importantes nos próximos 14 dias.
 */
export function createDocumentosHojeProvider(client: SupabaseClient<Database>) {
  return async function documentosHojeProvider(): Promise<HojeItem[]> {
    const todayStr = localDateKey();
    const soonStr = localDateKeyInDays(14);

    const [warranties, importantDates] = await Promise.all([
      listUpcomingWarranties(client, todayStr, soonStr),
      listUpcomingImportantDates(client, todayStr, soonStr),
    ]);

    const warrantyItems: HojeItem[] = warranties.map((w) => ({
      id: w.id,
      source: "documentos",
      title: `Garantia terminando: ${w.product_name}`,
      time: w.end_date,
      priority: "atencao" as const,
    }));

    const dateItems: HojeItem[] = importantDates.map((d) => ({
      id: d.id,
      source: "documentos",
      title: d.label,
      time: d.date,
    }));

    return [...warrantyItems, ...dateItems];
  };
}
