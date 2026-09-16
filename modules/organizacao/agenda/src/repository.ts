import type { SupabaseClient, Database } from "@qqorvex/database";
import { computeNextEventOccurrenceDate } from "./service";
import type { CalendarEvent, EventReminder, GoogleCalendarConnection, NewEventInput, RecurringEvent, RecurringEventFrequency } from "./types";
import { toEventInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listEventsInRange(
  client: Client,
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<CalendarEvent[]> {
  const { data, error } = await client
    .from("events")
    .select("*")
    .lt("start_at", rangeEndIso)
    .gt("end_at", rangeStartIso)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** "Listar tudo" (sem filtro de período) — usado pelo picker de Referência de Entidade do Segundo Cérebro. */
export async function listAllEvents(client: Client): Promise<CalendarEvent[]> {
  const { data, error } = await client.from("events").select("*").order("start_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createEvent(client: Client, userId: string, input: NewEventInput): Promise<CalendarEvent> {
  const { data, error } = await client
    .from("events")
    .insert(toEventInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;

  if (input.reminderMinutesBefore !== undefined) {
    await createEventReminder(client, data.id, input.reminderMinutesBefore);
  }

  return data;
}

/** "Lembretes têm tabela mas nada os dispara" — agora dispara via `send-notifications` (pg_cron). */
export async function createEventReminder(client: Client, eventId: string, minutesBefore: number): Promise<EventReminder> {
  const { data, error } = await client
    .from("event_reminders")
    .insert({ event_id: eventId, minutes_before: minutesBefore })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listEventReminders(client: Client, eventId: string): Promise<EventReminder[]> {
  const { data, error } = await client.from("event_reminders").select("*").eq("event_id", eventId);
  if (error) throw error;
  return data;
}

/**
 * Continua exclusão física direta (sem lixeira) — comportamento inalterado. Único efeito
 * colateral novo: se o evento já estava sincronizado com o Google (`google_event_id` presente),
 * registra em `pending_google_deletions` pra `sync-google-calendar` apagar do outro lado depois
 * que a linha já não existe mais aqui.
 */
export async function deleteEvent(client: Client, eventId: string): Promise<void> {
  const { data, error } = await client
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("user_id, google_event_id")
    .single();
  if (error) throw error;

  if (data.google_event_id) {
    const { error: pendingError } = await client
      .from("pending_google_deletions")
      .insert({ user_id: data.user_id, google_event_id: data.google_event_id });
    if (pendingError) throw pendingError;
  }
}

/**
 * "Agenda apresenta a representação temporal... não duplicar o registro principal." Usado antes
 * de criar um evento derivado de uma avaliação, para não gerar duas ocorrências pra mesma prova.
 */
export async function listEventsByAssessment(client: Client, assessmentId: string): Promise<CalendarEvent[]> {
  const { data, error } = await client.from("events").select("*").eq("assessment_id", assessmentId);
  if (error) throw error;
  return data;
}

/**
 * Só fala com a API do Zoom (via Edge Function `create-zoom-meeting`) e devolve o link — não cria
 * o evento sozinha. Quem cria o evento é `createEvent()`, chamado depois com o link retornado
 * aqui, reaproveitando toda a lógica de criação (inclusive `findConflicts()`) já existente.
 */
export async function createZoomMeeting(
  client: Client,
  input: { title: string; startAt: string; endAt: string },
): Promise<{ joinUrl: string; startAt: string; endAt: string }> {
  const { data, error } = await client.functions.invoke("create-zoom-meeting", { body: input });
  if (error) {
    // FunctionsHttpError só traz uma mensagem genérica ("non-2xx status code") — o corpo de
    // verdade (com a mensagem detalhada que a função retorna) vem em `error.context`, a Response
    // crua, que precisa ser lida separadamente.
    const context = (error as { context?: Response }).context;
    let detailedMessage: string | null = null;
    if (context) {
      try {
        const body = await context.json();
        detailedMessage = body.error ?? null;
      } catch {
        detailedMessage = null;
      }
    }
    throw new Error(detailedMessage ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Não expõe o `refresh_token` pro chamador — só o suficiente pra UI mostrar "conectado". */
export async function getGoogleCalendarConnection(client: Client): Promise<GoogleCalendarConnection | null> {
  const { data, error } = await client.from("google_calendar_connections").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/** Só apaga a conexão — nunca apaga eventos já sincronizados nos dois lados. */
export async function disconnectGoogleCalendar(client: Client, userId: string): Promise<void> {
  const { error } = await client.from("google_calendar_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

/** Gera o token opaco (`id`) que vira o parâmetro `state` do redirecionamento OAuth do Google. */
export async function createGoogleOAuthState(client: Client, userId: string): Promise<string> {
  const { data, error } = await client.from("google_oauth_states").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function listRecurringEvents(client: Client): Promise<RecurringEvent[]> {
  const { data, error } = await client
    .from("recurring_events")
    .select("*")
    .order("next_occurrence_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createRecurringEvent(
  client: Client,
  userId: string,
  input: {
    title: string;
    isAllDay?: boolean;
    startTime?: string;
    endTime?: string;
    frequency: RecurringEventFrequency;
    startDate: string;
  },
): Promise<RecurringEvent> {
  const { data, error } = await client
    .from("recurring_events")
    .insert({
      user_id: userId,
      title: input.title,
      is_all_day: input.isAllDay ?? false,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      frequency: input.frequency,
      start_date: input.startDate,
      next_occurrence_date: input.startDate,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringEventStatus(
  client: Client,
  id: string,
  status: RecurringEvent["status"],
): Promise<RecurringEvent> {
  const { data, error } = await client.from("recurring_events").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * "Cada ocorrência é um evento vinculado à recorrência." Combina `next_occurrence_date` +
 * `start_time`/`end_time` (dia inteiro vira 00:00:00–23:59:59, mesmo padrão de `QuickEventForm`)
 * em `start_at`/`end_at`, cria o evento de verdade e avança `next_occurrence_date`. O evento
 * gerado é independente da recorrência depois de criada — editar/apagar não afeta a série.
 */
export async function generateEventOccurrence(client: Client, userId: string, recurring: RecurringEvent): Promise<CalendarEvent> {
  const dateStr = recurring.next_occurrence_date;
  const startAt = recurring.is_all_day ? `${dateStr}T00:00:00` : `${dateStr}T${recurring.start_time}`;
  const endAt = recurring.is_all_day ? `${dateStr}T23:59:59` : `${dateStr}T${recurring.end_time}`;

  const { data: event, error: eventError } = await client
    .from("events")
    .insert({
      user_id: userId,
      title: recurring.title,
      description: recurring.description,
      location: recurring.location,
      meeting_link: recurring.meeting_link,
      category: recurring.category,
      is_all_day: recurring.is_all_day,
      start_at: startAt,
      end_at: endAt,
      buffer_before_minutes: recurring.buffer_before_minutes,
      buffer_after_minutes: recurring.buffer_after_minutes,
    })
    .select("*")
    .single();
  if (eventError) throw eventError;

  const { error: updateError } = await client
    .from("recurring_events")
    .update({ next_occurrence_date: computeNextEventOccurrenceDate(recurring.next_occurrence_date, recurring.frequency) })
    .eq("id", recurring.id);
  if (updateError) throw updateError;

  return event;
}
