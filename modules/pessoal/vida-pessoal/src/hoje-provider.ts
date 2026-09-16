import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { getCheckinForDate, listAllVehicleImportantDates, listVehicles } from "./repository";

const IMPORTANT_DATE_WINDOW_DAYS = 14;

/**
 * "Não vira feed" (mesmo princípio de Biblioteca) — só o lembrete de check-in pendente e datas
 * importantes de Veículos nos próximos 14 dias aparecem no Hoje (mesma janela que Documentos já
 * usa). Planos/Projetos/Ideias/Contatos/Bens/Compras ficam só dentro de `/vida-pessoal`.
 */
export function createVidaPessoalHojeProvider(client: SupabaseClient<Database>) {
  return async function vidaPessoalHojeProvider(): Promise<HojeItem[]> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const soonThreshold = new Date(today);
    soonThreshold.setDate(soonThreshold.getDate() + IMPORTANT_DATE_WINDOW_DAYS);
    const soonStr = soonThreshold.toISOString().slice(0, 10);

    const [checkin, vehicles, vehicleDates] = await Promise.all([
      getCheckinForDate(client, todayStr),
      listVehicles(client),
      listAllVehicleImportantDates(client),
    ]);

    const items: HojeItem[] = [];

    if (!checkin) {
      items.push({ id: "vida-pessoal-checkin-lembrete", source: "vida-pessoal", title: "Fazer check-in de hoje" });
    }

    const vehiclesById = new Map(vehicles.map((v) => [v.id, v]));
    for (const vehicleDate of vehicleDates) {
      if (vehicleDate.date < todayStr || vehicleDate.date > soonStr) continue;
      const vehicle = vehiclesById.get(vehicleDate.vehicle_id);
      items.push({
        id: `vida-pessoal-vehicle-date-${vehicleDate.id}`,
        source: "vida-pessoal",
        title: `${vehicleDate.label}${vehicle ? ` (${vehicle.nickname})` : ""}`,
        time: vehicleDate.date,
        priority: vehicleDate.date <= todayStr ? "atencao" : undefined,
      });
    }

    return items;
  };
}
