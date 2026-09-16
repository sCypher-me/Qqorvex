import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent, deleteEvent, listEventsInRange } from "@qqorvex/module-agenda";
import type { ToolDefinition } from "../types";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Ferramentas da Vex para Agenda & Tempo. Só chamam a API pública de `@qqorvex/module-agenda`.
 * v1: eventos de hoje/criação simples com horário (sem recorrência, sem conflito automático —
 * ver `findConflicts` no módulo para quando a UI de criação pela Vex ganhar essa checagem).
 */
export function createAgendaTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_events_today",
      description: "Lista os eventos de hoje na Agenda",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const { start, end } = todayRange();
        const events = await listEventsInRange(client, start.toISOString(), end.toISOString());
        if (events.length === 0) return { summary: "Você não tem eventos hoje." };
        const lines = events
          .map((e) => (e.is_all_day ? `- ${e.title} (dia inteiro)` : `- ${e.title} às ${e.start_at.slice(11, 16)}`))
          .join("\n");
        return { summary: `Eventos de hoje:\n${lines}`, data: events };
      },
    },
    {
      name: "create_event_today",
      description: "Cria um evento hoje em um horário específico (HH:MM), duração padrão de 1 hora",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          time: { type: "string", description: "Horário no formato HH:MM" },
        },
        required: ["title", "time"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        const time = String(args.time ?? "").trim();
        if (!title || !/^\d{1,2}:\d{2}$/.test(time)) {
          return { summary: "Não consegui criar o evento: título ou horário inválido." };
        }
        const dateStr = new Date().toISOString().slice(0, 10);
        const [hours, minutes] = time.split(":").map(Number);
        const startAt = new Date(`${dateStr}T${time}:00`);
        const endAt = new Date(startAt);
        endAt.setHours((hours ?? 0) + 1, minutes ?? 0, 0, 0);
        const event = await createEvent(client, userId, {
          title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
        return { summary: `Evento criado: "${event.title}" às ${time}.`, data: event };
      },
    },
    {
      name: "delete_event_by_title",
      description: "Apaga um evento da Agenda (dos últimos 30 dias até os próximos 90) cujo título corresponda ao informado",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Título (ou parte dele) do evento" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.title ?? "")
          .trim()
          .toLowerCase();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const end = new Date();
        end.setDate(end.getDate() + 90);
        const events = await listEventsInRange(client, start.toISOString(), end.toISOString());
        const match = events.find((e) => e.title.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhum evento parecido com "${args.title}".` };
        await deleteEvent(client, match.id);
        return { summary: `Evento apagado: "${match.title}".` };
      },
    },
  ];
}
