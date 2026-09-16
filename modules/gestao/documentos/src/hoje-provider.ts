import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listUpcomingImportantDates, listUpcomingWarranties } from "./repository";

/**
 * "Hoje pode mostrar: garantias próximas do fim, contratos próximos de renovação/término,
 * documentos importantes com lembrete." v1: garantias e datas importantes nos próximos 14 dias.
 */
export function createDocumentosHojeProvider(client: SupabaseClient<Database>) {
  return async function documentosHojeProvider(): Promise<HojeItem[]> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);
    const soonStr = soon.toISOString().slice(0, 10);

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
