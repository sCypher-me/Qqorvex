import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listEventsInRange } from "./repository";

/**
 * "Hoje pode mostrar: próximos eventos, próxima reunião, próximo bloco de foco, resumo do dia."
 * Hoje só chama esta função através do registry — nunca importa este módulo diretamente.
 */
export function createAgendaHojeProvider(client: SupabaseClient<Database>) {
  return async function agendaHojeProvider(): Promise<HojeItem[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const events = await listEventsInRange(client, startOfDay.toISOString(), endOfDay.toISOString());

    return events.map((event) => ({
      id: event.id,
      source: "agenda",
      title: event.title,
      time: event.is_all_day
        ? undefined
        : new Date(event.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      priority: event.category === "reuniao" ? ("importante" as const) : undefined,
    }));
  };
}
