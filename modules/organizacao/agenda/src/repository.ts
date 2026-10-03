import type { SupabaseClient, Database } from "@qqorvex/database";
import { toRecurringEventUpdate, type RecurringEventEditInput } from "./service";
import type { CalendarEvent, EventReminder, NewEventInput, RecurringEvent, RecurringEventFrequency } from "./types";
import { toEventInsert, toEventUpdate } from "./types";

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

export async function updateEvent(client: Client, eventId: string, input: NewEventInput): Promise<CalendarEvent> {
  const { data, error } = await client
    .from("events")
    .update(toEventUpdate(input))
    .eq("id", eventId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** "Lembretes têm tabela mas nada os dispara" — agora dispara via `send-notifications` (pg_cron). */
async function createEventReminder(client: Client, eventId: string, minutesBefore: number): Promise<EventReminder> {
  const { data, error } = await client
    .from("event_reminders")
    .insert({ event_id: eventId, minutes_before: minutesBefore })
    .select("*")
    .single();
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

/** Retorna somente o estado da conexão; tokens nunca são lidos pelo navegador. */
export async function getGoogleCalendarConnection(client: Client): Promise<boolean> {
  const { data, error } = await client.rpc("has_google_calendar_connection");
  if (error) throw error;
  return data;
}

/** Revoga o refresh token no Google e remove a conexão no servidor. */
export async function disconnectGoogleCalendar(client: Client): Promise<void> {
  const { data, error } = await client.functions.invoke("google-calendar-disconnect", { body: {} });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    throw new Error(data.error);
  }
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

/**
 * Grava a edição só se a série ainda estiver na data que a pessoa abriu — o cron pode tê-la
 * avançado nesse meio-tempo, e gravar a data antiga duplicaria um evento.
 */
export async function updateRecurringEvent(client: Client, current: RecurringEvent, input: RecurringEventEditInput): Promise<RecurringEvent> {
  const { data, error } = await client
    .from("recurring_events")
    .update(toRecurringEventUpdate(current, input))
    .eq("id", current.id)
    .eq("next_occurrence_date", current.next_occurrence_date)
    .select("*")
    .single();
  if (error?.code === "PGRST116") throw new Error("Esta repetição avançou enquanto você editava. Abra de novo para ver a data atual.");
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
    timeZone: string;
  },
): Promise<RecurringEvent> {
  const values = {
    user_id: userId,
    title: input.title,
    is_all_day: input.isAllDay ?? false,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    frequency: input.frequency,
    start_date: input.startDate,
    next_occurrence_date: input.startDate,
  };
  const { data, error } = await client
    .from("recurring_events")
    .insert({ ...values, time_zone: input.timeZone })
    .select("*")
    .single();
  if (error && /time_zone/i.test(error.message) && (error.code === "42703" || error.code === "PGRST204")) {
    // Graceful transition while the additive migration is awaiting deployment.
    const legacyResult = await client.from("recurring_events").insert(values).select("*").single();
    if (legacyResult.error) throw legacyResult.error;
    return legacyResult.data;
  }
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
