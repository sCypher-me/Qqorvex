import type { CalendarEvent, RecurringEventFrequency } from "./types";

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
 * Tarefas pra isso). Ver docs/decisions/eventos-recorrentes-design.md.
 */
export function computeNextEventOccurrenceDate(currentDate: string, frequency: RecurringEventFrequency): string {
  const date = new Date(`${currentDate}T00:00:00`);
  if (frequency === "diaria") date.setDate(date.getDate() + 1);
  else if (frequency === "semanal") date.setDate(date.getDate() + 7);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}
