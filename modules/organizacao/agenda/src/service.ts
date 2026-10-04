import type { TablesUpdate } from "@qqorvex/database";
import { localDateInputValue } from "./dateUtils";
import type { CalendarEvent, RecurringEvent, RecurringEventFrequency } from "./types";

export interface RecurringEventEditInput {
  title: string;
  isAllDay: boolean;
  /** HH:MM:SS; ignorado em dia inteiro. */
  startTime?: string;
  endTime?: string;
  frequency: RecurringEventFrequency;
  nextOccurrenceDate: string;
}

/**
 * Edição de uma série de eventos: vale da próxima ocorrência em diante (eventos já criados não
 * mudam). Mudar a próxima data move também `start_date`, âncora do dia do mês na série mensal.
 * A data nova não pode ficar no passado — o cron recupera datas vencidas e criaria vários eventos.
 * Descrição, local, link, folgas e fuso não estão no formulário e ficam como estão.
 */
export function toRecurringEventUpdate(
  current: Pick<RecurringEvent, "next_occurrence_date">,
  input: RecurringEventEditInput,
  today = localDateInputValue(new Date()),
): TablesUpdate<"recurring_events"> {
  const dateChanged = input.nextOccurrenceDate !== current.next_occurrence_date;
  if (dateChanged && input.nextOccurrenceDate < today) throw new Error("A próxima data não pode ficar no passado.");
  if (!input.isAllDay && (!input.startTime || !input.endTime || input.endTime <= input.startTime)) {
    throw new Error("O término precisa ser depois do início.");
  }
  return {
    title: input.title,
    is_all_day: input.isAllDay,
    start_time: input.isAllDay ? null : input.startTime,
    end_time: input.isAllDay ? null : input.endTime,
    frequency: input.frequency,
    next_occurrence_date: input.nextOccurrenceDate,
    ...(dateChanged ? { start_date: input.nextOccurrenceDate } : {}),
  };
}

interface TimeRange {
  start: Date;
  end: Date;
}

function effectiveRange(event: CalendarEvent): TimeRange {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  start.setMinutes(start.getMinutes() - event.buffer_before_minutes);
  end.setMinutes(end.getMinutes() + event.buffer_after_minutes);
  return { start, end };
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * "Antes de criar/editar, o sistema deve identificar sobreposição relevante." Buffers contam
 * para a checagem de conflito mas não alteram o horário oficial do evento.
 */
export function findConflicts(
  events: CalendarEvent[],
  candidate: { startAt: string; endAt: string; excludeEventId?: string },
): CalendarEvent[] {
  const candidateRange: TimeRange = { start: new Date(candidate.startAt), end: new Date(candidate.endAt) };
  return events.filter((event) => {
    if (event.id === candidate.excludeEventId) return false;
    if (event.is_all_day) return false;
    return overlaps(effectiveRange(event), candidateRange);
  });
}

export class EventConflictError extends Error {
  readonly name = "EventConflictError";

  constructor(readonly conflicts: CalendarEvent[]) {
    super(`Este horário já está ocupado por: ${conflicts.map((event) => event.title).join(", ")}.`);
  }
}

export function normalizeEventSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

/**
 * "Agenda pode calcular intervalos livres considerando eventos, blocos e buffers." Retorna
 * janelas livres dentro do intervalo pedido com pelo menos `durationMinutes`.
 */
export function findFreeSlots(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMinutes: number,
): TimeRange[] {
  const busy = events
    .filter((event) => !event.is_all_day)
    .map(effectiveRange)
    .filter((range) => range.end > rangeStart && range.start < rangeEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const freeSlots: TimeRange[] = [];
  let cursor = rangeStart;

  for (const busyRange of busy) {
    if (busyRange.start > cursor) {
      const gapMinutes = (busyRange.start.getTime() - cursor.getTime()) / 60_000;
      if (gapMinutes >= durationMinutes) freeSlots.push({ start: cursor, end: busyRange.start });
    }
    if (busyRange.end > cursor) cursor = busyRange.end;
  }

  if (rangeEnd > cursor) {
    const gapMinutes = (rangeEnd.getTime() - cursor.getTime()) / 60_000;
    if (gapMinutes >= durationMinutes) freeSlots.push({ start: cursor, end: rangeEnd });
  }

  return freeSlots;
}

/**
 * `state` é um token opaco gerado no servidor (linha em `google_oauth_states`), não algo
 * autoverificável — evita precisar de segredo de assinatura no cliente. `access_type=offline` +
 * `prompt=consent` garantem que o Google devolva um `refresh_token` (só vem na primeira
 * autorização, ou quando o consentimento é forçado de novo).
 */
export function buildGoogleAuthUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state: input.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * "A frequência determina automaticamente a próxima data" — mesma lógica de
 * `computeNextTaskOccurrenceDate` em Tarefas, mas própria de Agenda (sem importar o módulo de
 * Tarefas pra isso).
 */
export function computeNextEventOccurrenceDate(
  currentDate: string,
  frequency: RecurringEventFrequency,
  monthlyAnchorDay?: number,
): string {
  const [year, month, day] = currentDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  if (frequency === "diaria") date.setUTCDate(date.getUTCDate() + 1);
  else if (frequency === "semanal") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
    nextMonth.setUTCDate(Math.min(Math.max(monthlyAnchorDay ?? day!, 1), lastDay));
    return nextMonth.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}
