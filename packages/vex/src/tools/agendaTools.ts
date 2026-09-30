import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent, deleteEvent, findConflicts, listEventsInRange, updateEvent, type CalendarEvent } from "@qqorvex/module-agenda";
import type { ToolDefinition } from "../types";
import { addDays, ambiguousSummary, formatDateKey, formatTime, isDateKey, isTime, localDateKey, localDateTime, matchByName } from "./shared";

function dayStart(dateKey: string): Date {
  return localDateTime(dateKey, "00:00");
}

export function describeEvent(event: CalendarEvent, today = localDateKey()): string {
  const date = localDateKey(new Date(event.start_at));
  const when = event.is_all_day ? "dia inteiro" : `${formatTime(event.start_at)}–${formatTime(event.end_at)}`;
  return `- ${formatDateKey(date, today)} (${date}) · ${when} · ${event.title}${event.location ? ` · ${event.location}` : ""}`;
}

async function eventsBetween(client: SupabaseClient<Database>, from: string, toInclusive: string) {
  return listEventsInRange(client, dayStart(from).toISOString(), dayStart(addDays(toInclusive, 1)).toISOString());
}

/**
 * Novo início/fim de um evento editado. O que não foi pedido continua igual: mudar só a data
 * mantém horário e duração; mudar só o início mantém a duração; dia inteiro continua dia inteiro
 * a menos que venha um horário de início.
 */
export function rescheduleEvent(
  event: Pick<CalendarEvent, "start_at" | "end_at" | "is_all_day">,
  changes: { date?: string; startTime?: string; endTime?: string },
): { allDay: boolean; start: Date; end: Date } | { error: string } {
  const currentStart = new Date(event.start_at);
  const currentEnd = new Date(event.end_at);
  const date = changes.date ?? localDateKey(currentStart);
  const allDay = event.is_all_day && !changes.startTime;
  if (allDay) return { allDay, start: dayStart(date), end: dayStart(addDays(date, 1)) };

  const startTime = changes.startTime ?? (event.is_all_day ? "09:00" : formatTime(currentStart));
  const start = localDateTime(date, startTime);
  const duration = event.is_all_day ? 60 * 60_000 : currentEnd.getTime() - currentStart.getTime();
  const end = changes.endTime ? localDateTime(date, changes.endTime) : new Date(start.getTime() + duration);
  if (end <= start) return { error: "o término precisa ser depois do início" };
  return { allDay, start, end };
}

/** Ferramentas da Vex para a Agenda. Só chamam a API pública de `@qqorvex/module-agenda`. */
export function createAgendaTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_events_today",
      label: "Agenda",
      description: "Lista os compromissos de hoje na Agenda",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const today = localDateKey();
        const events = await eventsBetween(client, today, today);
        if (events.length === 0) return { summary: "Nenhum compromisso hoje." };
        return { summary: `Compromissos de hoje:\n${events.map((event) => describeEvent(event, today)).join("\n")}`, data: events };
      },
    },
    {
      name: "list_events",
      label: "Agenda",
      description: "Lista os compromissos entre duas datas (inclusive). Sem datas, lista de hoje até daqui a 7 dias.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Data inicial AAAA-MM-DD" },
          to: { type: "string", description: "Data final AAAA-MM-DD (máx. 62 dias depois da inicial)" },
        },
      },
      requiresConfirmation: false,
      async execute(args) {
        const today = localDateKey();
        const from = isDateKey(args.from) ? args.from : today;
        let to = isDateKey(args.to) ? args.to : addDays(from, 7);
        if (to < from) to = from;
        if (to > addDays(from, 62)) to = addDays(from, 62);
        const events = await eventsBetween(client, from, to);
        if (events.length === 0) return { summary: `Nenhum compromisso entre ${from} e ${to}.` };
        return { summary: `Compromissos de ${from} a ${to}:\n${events.map((event) => describeEvent(event, today)).join("\n")}`, data: events };
      },
    },
    {
      name: "create_event",
      label: "Agenda",
      description:
        "Cria um compromisso na Agenda em qualquer data. Precisa de título, data e horário de início (ou allDay=true). Sem horário de término, dura durationMinutes (padrão 60).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "Data AAAA-MM-DD" },
          startTime: { type: "string", description: "Início HH:MM" },
          endTime: { type: "string", description: "Término HH:MM (opcional)" },
          durationMinutes: { type: "number", description: "Duração em minutos se não houver término (opcional)" },
          allDay: { type: "boolean", description: "Dia inteiro (opcional)" },
          location: { type: "string", description: "Local (opcional)" },
        },
        required: ["title", "date"],
      },
      requiresConfirmation: true,
      preview: (args) => {
        const date = isDateKey(args.date) ? formatDateKey(args.date) : String(args.date ?? "");
        const when = args.allDay === true ? "Dia inteiro" : `${args.startTime ?? "?"}${isTime(args.endTime) ? ` às ${args.endTime}` : ""}`;
        return {
          title: "Criar compromisso",
          fields: [
            { label: "Compromisso", value: String(args.title ?? "") },
            { label: "Quando", value: `${date} · ${when}` },
            ...(args.location ? [{ label: "Local", value: String(args.location) }] : []),
          ],
        };
      },
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title || !isDateKey(args.date)) return { summary: "Não criei o compromisso: preciso de um título e de uma data AAAA-MM-DD." };
        const allDay = args.allDay === true;
        if (!allDay && !isTime(args.startTime)) return { summary: "Não criei o compromisso: falta o horário de início (HH:MM). Pergunte à pessoa." };
        const start = allDay ? dayStart(args.date) : localDateTime(args.date, args.startTime as string);
        let end: Date;
        if (allDay) end = dayStart(addDays(args.date, 1));
        else if (isTime(args.endTime)) end = localDateTime(args.date, args.endTime);
        else end = new Date(start.getTime() + Math.min(Math.max(Number(args.durationMinutes) || 60, 5), 24 * 60) * 60_000);
        if (end <= start) return { summary: "Não criei o compromisso: o término precisa ser depois do início." };

        const sameDay = await eventsBetween(client, args.date, args.date);
        const conflicts = allDay ? [] : findConflicts(sameDay, { startAt: start.toISOString(), endAt: end.toISOString() });
        const event = await createEvent(client, userId, {
          title,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          isAllDay: allDay,
          location: args.location ? String(args.location) : undefined,
        });
        const warning = conflicts.length ? ` Atenção: coincide com ${conflicts.map((c) => `"${c.title}"`).join(", ")}.` : "";
        return { summary: `Compromisso criado: "${event.title}" ${formatDateKey(args.date)}${allDay ? " (dia inteiro)" : ` às ${formatTime(start)}`}.${warning}`, data: event };
      },
    },
    {
      name: "create_event_today",
      label: "Agenda",
      description: "Cria um compromisso HOJE em um horário (HH:MM), com 1 hora de duração. Para outras datas use create_event.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          time: { type: "string", description: "Horário no formato HH:MM" },
        },
        required: ["title", "time"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Criar compromisso",
        fields: [
          { label: "Compromisso", value: String(args.title ?? "") },
          { label: "Quando", value: `hoje · ${String(args.time ?? "")}` },
        ],
      }),
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title || !isTime(args.time)) return { summary: "Não consegui criar o compromisso: título ou horário inválido." };
        const start = localDateTime(localDateKey(), args.time);
        const end = new Date(start.getTime() + 60 * 60_000);
        const event = await createEvent(client, userId, { title, startAt: start.toISOString(), endAt: end.toISOString() });
        return { summary: `Compromisso criado: "${event.title}" hoje às ${formatTime(start)}.`, data: event };
      },
    },
    {
      name: "update_event_by_title",
      label: "Agenda",
      description:
        "Muda um compromisso existente (dos últimos 30 dias até os próximos 90), achado pelo título: novo título, nova data e/ou novo horário. Só informe o que a pessoa quer mudar — o resto (duração, local, descrição) continua igual.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título atual (ou parte dele) do compromisso" },
          newTitle: { type: "string", description: "Novo título (opcional)" },
          date: { type: "string", description: "Nova data AAAA-MM-DD (opcional)" },
          startTime: { type: "string", description: "Novo início HH:MM (opcional)" },
          endTime: { type: "string", description: "Novo término HH:MM (opcional)" },
          location: { type: "string", description: "Novo local (opcional)" },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Alterar compromisso",
        fields: [
          { label: "Compromisso", value: String(args.title ?? "") },
          ...(args.newTitle ? [{ label: "Novo título", value: String(args.newTitle) }] : []),
          ...(isDateKey(args.date) ? [{ label: "Nova data", value: formatDateKey(args.date) }] : []),
          ...(isTime(args.startTime) ? [{ label: "Novo horário", value: `${args.startTime}${isTime(args.endTime) ? ` às ${args.endTime}` : ""}` }] : []),
          ...(args.location ? [{ label: "Novo local", value: String(args.location) }] : []),
        ],
      }),
      async execute(args) {
        if (args.date !== undefined && !isDateKey(args.date)) return { summary: "Não alterei: a data precisa estar no formato AAAA-MM-DD." };
        if ((args.startTime !== undefined && !isTime(args.startTime)) || (args.endTime !== undefined && !isTime(args.endTime))) {
          return { summary: "Não alterei: horários precisam estar no formato HH:MM." };
        }
        const today = localDateKey();
        const events = await eventsBetween(client, addDays(today, -30), addDays(today, 90));
        const match = matchByName(events, String(args.title ?? ""), (event) => event.title);
        if (match.kind === "none") return { summary: `Não encontrei nenhum compromisso parecido com "${args.title}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("um compromisso", match.items, (event) => `${event.title} (${formatDateKey(localDateKey(new Date(event.start_at)), today)})`) };

        const event = match.item;
        const schedule = rescheduleEvent(event, {
          date: isDateKey(args.date) ? args.date : undefined,
          startTime: isTime(args.startTime) ? args.startTime : undefined,
          endTime: isTime(args.endTime) ? args.endTime : undefined,
        });
        if ("error" in schedule) return { summary: `Não alterei: ${schedule.error}.` };

        const newTitle = String(args.newTitle ?? "").trim();
        const updated = await updateEvent(client, event.id, {
          title: newTitle || event.title,
          description: event.description ?? undefined,
          location: args.location ? String(args.location) : event.location ?? undefined,
          meetingLink: event.meeting_link ?? undefined,
          category: event.category,
          isAllDay: schedule.allDay,
          startAt: schedule.start.toISOString(),
          endAt: schedule.end.toISOString(),
        });
        const day = localDateKey(schedule.start);
        const sameDay = schedule.allDay ? [] : (await eventsBetween(client, day, day)).filter((other) => other.id !== event.id);
        const conflicts = schedule.allDay ? [] : findConflicts(sameDay, { startAt: schedule.start.toISOString(), endAt: schedule.end.toISOString() });
        const warning = conflicts.length ? ` Atenção: coincide com ${conflicts.map((c) => `"${c.title}"`).join(", ")}.` : "";
        return {
          summary: `Compromisso alterado: "${updated.title}" ${formatDateKey(day, today)}${schedule.allDay ? " (dia inteiro)" : ` das ${formatTime(schedule.start)} às ${formatTime(schedule.end)}`}.${warning}`,
          data: updated,
        };
      },
    },
    {
      name: "delete_event_by_title",
      label: "Agenda",
      description: "Apaga um compromisso da Agenda (dos últimos 30 dias até os próximos 90) cujo título corresponda ao informado",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Título (ou parte dele) do compromisso" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      preview: (args) => ({ title: "Apagar compromisso", fields: [{ label: "Compromisso", value: String(args.title ?? "") }], note: "Essa ação não pode ser desfeita." }),
      async execute(args) {
        const today = localDateKey();
        const events = await eventsBetween(client, addDays(today, -30), addDays(today, 90));
        const match = matchByName(events, String(args.title ?? ""), (event) => event.title);
        if (match.kind === "none") return { summary: `Não encontrei nenhum compromisso parecido com "${args.title}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("um compromisso", match.items, (event) => `${event.title} (${formatDateKey(localDateKey(new Date(event.start_at)), today)})`) };
        await deleteEvent(client, match.item.id);
        return { summary: `Compromisso apagado: "${match.item.title}".` };
      },
    },
  ];
}
