import { addDays, startOfDay } from "./dateUtils";
import type { CalendarEvent } from "./types";

/** Evento posicionado na grade de horários de um dia. */
export interface PositionedEvent {
  event: CalendarEvent;
  /** Minutos desde 00:00 do dia (recortado ao dia). */
  startMinute: number;
  endMinute: number;
  /** Coluna dentro do grupo de sobreposição e total de colunas do grupo. */
  column: number;
  columns: number;
  /** O evento continua de/para outro dia. */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

const MIN_DURATION = 20;

/**
 * Distribui os eventos com horário de um dia em colunas, para que eventos simultâneos fiquem
 * lado a lado (mesmo algoritmo dos calendários comerciais: agrupa por sobreposição transitiva e
 * aloca a primeira coluna livre).
 */
export function layoutDayEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const items = events
    .filter((event) => !event.is_all_day)
    .map((event) => {
      const start = new Date(event.start_at).getTime();
      const end = new Date(event.end_at).getTime();
      return { event, start, end };
    })
    .filter((item) => item.start < dayEnd && item.end > dayStart)
    .map((item) => {
      const startMinute = Math.max(0, Math.round((item.start - dayStart) / 60_000));
      const endMinute = Math.min(1440, Math.max(startMinute + MIN_DURATION, Math.round((item.end - dayStart) / 60_000)));
      return {
        event: item.event,
        startMinute,
        endMinute,
        continuesBefore: item.start < dayStart,
        continuesAfter: item.end > dayEnd,
      };
    })
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  const result: PositionedEvent[] = [];
  let cluster: Array<(typeof items)[number] & { column: number }> = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = Math.max(1, ...cluster.map((item) => item.column + 1));
    for (const item of cluster) result.push({ ...item, columns });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of items) {
    if (cluster.length && item.startMinute >= clusterEnd) flush();
    const columnEnds: number[] = [];
    for (const placed of cluster) columnEnds[placed.column] = Math.max(columnEnds[placed.column] ?? 0, placed.endMinute);
    let column = columnEnds.findIndex((end) => end !== undefined && end <= item.startMinute);
    if (column === -1) column = columnEnds.length;
    cluster.push({ ...item, column });
    clusterEnd = Math.max(clusterEnd, item.endMinute);
  }
  if (cluster.length) flush();
  return result;
}

/** Eventos de dia inteiro (ou que atravessam o dia todo) para a faixa superior. */
export function allDayEventsFor(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return events.filter((event) => {
    const start = new Date(event.start_at).getTime();
    const end = new Date(event.end_at).getTime();
    if (event.is_all_day) return start < dayEnd && end > dayStart;
    return start <= dayStart && end >= dayEnd;
  });
}

/** Todos os eventos que tocam o dia (para mês/lista). */
export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return events
    .filter((event) => new Date(event.start_at).getTime() < dayEnd && new Date(event.end_at).getTime() > dayStart)
    .sort((a, b) => Number(b.is_all_day) - Number(a.is_all_day) || a.start_at.localeCompare(b.start_at));
}

/** Arredonda minutos para o passo da grade (padrão 15 min). */
export function snapMinutes(minutes: number, step = 15): number {
  return Math.max(0, Math.min(1440, Math.round(minutes / step) * step));
}

export interface EventCategory {
  key: string;
  label: string;
  color: string;
}

/** Categorias de evento — cor só como reforço; o nome sempre aparece em detalhes/tooltip. */
export const EVENT_CATEGORIES: EventCategory[] = [
  { key: "compromisso", label: "Compromisso", color: "var(--q-cat-1)" },
  { key: "reuniao", label: "Reunião", color: "var(--q-cat-4)" },
  { key: "trabalho", label: "Trabalho", color: "var(--q-cat-7)" },
  { key: "pessoal", label: "Pessoal", color: "var(--q-cat-3)" },
  { key: "saude", label: "Saúde", color: "var(--q-cat-5)" },
  { key: "estudos", label: "Estudos", color: "var(--q-cat-2)" },
  { key: "foco", label: "Bloco de foco", color: "var(--q-cat-6)" },
  { key: "prazo", label: "Prazo", color: "var(--q-cat-8)" },
];

function normalizeCategory(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function eventCategory(category: string | null | undefined): EventCategory {
  const key = normalizeCategory(category ?? "");
  return EVENT_CATEGORIES.find((item) => item.key === key) ?? { key, label: category ? category.charAt(0).toUpperCase() + category.slice(1) : "Evento", color: "var(--q-cat-1)" };
}
