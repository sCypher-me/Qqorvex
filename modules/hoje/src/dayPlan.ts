/**
 * Plano do dia: encaixa as tarefas de hoje nos horários livres entre os compromissos, dentro da
 * janela de disponibilidade da pessoa, reservando 20% do tempo para pausas e imprevistos.
 *
 * Função pura e sem dados próprios (Hoje continua agregador): quem chama entrega as tarefas já na
 * ordem de prioridade do módulo de Tarefas e os compromissos do dia vindos da Agenda. Nada é gravado
 * aqui — o plano é recalculado sempre que tarefas, compromissos ou o relógio mudam, e qualquer
 * reorganização (mover prazo) só acontece depois da confirmação na interface.
 */

export interface DayWindow {
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
}

export const DEFAULT_DAY_WINDOW: DayWindow = { start: "08:00", end: "21:00" };
/** Fração do tempo livre reservada para pausas e imprevistos. */
export const PLAN_BUFFER_RATIO = 0.2;
/** Pausa depois de cada bloco de tarefa: 25% da duração mantém a tarefa em 80% do tempo usado. */
const PAUSE_RATIO = PLAN_BUFFER_RATIO / (1 - PLAN_BUFFER_RATIO);
const SLOT_MINUTES = 5;
const MIN_SPLIT_CHUNK = 30;
const MIN_WINDOW_MINUTES = 60;
export const DEFAULT_TASK_MINUTES = 30;

export interface PlanTaskInput {
  id: string;
  title: string;
  estimatedMinutes: number | null;
  /** Atrasada ou com prazo hoje: se não couber, o dia "não fecha" e a interface propõe mover. */
  mustFinishToday: boolean;
}

export interface PlanFixedBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export type PlanEntry =
  | { kind: "event"; id: string; title: string; start: Date; end: Date }
  | { kind: "task"; id: string; title: string; start: Date; end: Date; minutes: number; estimated: boolean; part?: { index: number; total: number } }
  | { kind: "pause"; start: Date; end: Date };

export interface PlanOverflowTask {
  id: string;
  title: string;
  minutes: number;
  estimated: boolean;
  mustFinishToday: boolean;
}

export type DayPlanStatus = "sem_tarefas" | "cabe" | "nao_cabe" | "encerrado";

export interface DayPlan {
  status: DayPlanStatus;
  windowStart: Date;
  windowEnd: Date;
  /** De onde o plano começa: agora (arredondado) ou o início da janela, o que vier depois. */
  from: Date;
  entries: PlanEntry[];
  overflow: PlanOverflowTask[];
  /** Minutos livres entre `from` e o fim da janela, fora dos compromissos. */
  freeMinutes: number;
  /** Minutos de tarefa que couberam no plano. */
  plannedMinutes: number;
  /** Tempo que as tarefas atrasadas ou de hoje que não couberam precisariam (com as pausas). */
  shortfallMinutes: number;
  /** Fim do último bloco de tarefa, quando há algum. */
  finishesAt: Date | null;
}

const MINUTE = 60_000;

export function parseClock(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Lê a janela salva nas preferências; valores inválidos ou curtos demais voltam ao padrão. */
export function normalizeDayWindow(value: unknown): DayWindow {
  if (!value || typeof value !== "object") return DEFAULT_DAY_WINDOW;
  const { start, end } = value as Record<string, unknown>;
  const startMinutes = parseClock(start);
  const endMinutes = parseClock(end);
  if (startMinutes === null || endMinutes === null || endMinutes - startMinutes < MIN_WINDOW_MINUTES) return DEFAULT_DAY_WINDOW;
  return { start: formatClock(startMinutes), end: formatClock(endMinutes) };
}

export function validateDayWindow(window: DayWindow): string | null {
  const start = parseClock(window.start);
  const end = parseClock(window.end);
  if (start === null || end === null) return "Use horários no formato HH:MM.";
  if (end - start < MIN_WINDOW_MINUTES) return "O fim precisa ser pelo menos 1 hora depois do início.";
  return null;
}

/**
 * Duração para tarefas sem estimativa: a mediana das estimativas que a própria pessoa já deu (é
 * assim que as correções anteriores entram), limitada entre 15 min e 2 h. Sem histórico, 30 min.
 */
export function defaultTaskMinutes(knownEstimates: number[]): number {
  const valid = knownEstimates.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (valid.length === 0) return DEFAULT_TASK_MINUTES;
  const middle = Math.floor(valid.length / 2);
  const median = valid.length % 2 ? valid[middle]! : (valid[middle - 1]! + valid[middle]!) / 2;
  return Math.min(120, Math.max(15, roundTo(median, SLOT_MINUTES)));
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function pauseFor(minutes: number): number {
  return Math.max(SLOT_MINUTES, roundTo(minutes * PAUSE_RATIO, SLOT_MINUTES));
}

function atClock(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function ceilToSlot(date: Date): Date {
  const slot = SLOT_MINUTES * MINUTE;
  return new Date(Math.ceil(date.getTime() / slot) * slot);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MINUTE));
}

interface Interval {
  start: Date;
  end: Date;
}

function freeIntervals(from: Date, to: Date, blocks: PlanFixedBlock[]): Interval[] {
  const busy = blocks
    .map((block) => ({ start: new Date(Math.max(block.start.getTime(), from.getTime())), end: new Date(Math.min(block.end.getTime(), to.getTime())) }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const intervals: Interval[] = [];
  let cursor = from;
  for (const block of busy) {
    if (block.start > cursor) intervals.push({ start: cursor, end: block.start });
    if (block.end > cursor) cursor = block.end;
  }
  if (to > cursor) intervals.push({ start: cursor, end: to });
  return intervals;
}

type Placement = Array<{ interval: number; start: Date; minutes: number; pause: number }>;

/** Primeiro lugar em que a tarefa inteira (com a pausa) cabe sem interrupção. */
function placeContiguous(intervals: Interval[], minutes: number): Placement | null {
  const pause = pauseFor(minutes);
  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index]!;
    if (minutesBetween(interval.start, interval.end) >= minutes + pause) {
      return [{ interval: index, start: interval.start, minutes, pause }];
    }
  }
  return null;
}

/** Tarefa longa demais para um único intervalo: divide em blocos de pelo menos 30 min. */
function placeSplit(intervals: Interval[], minutes: number): Placement | null {
  const placement: Placement = [];
  let remaining = minutes;
  for (let index = 0; index < intervals.length && remaining > 0; index += 1) {
    const interval = intervals[index]!;
    const length = minutesBetween(interval.start, interval.end);
    const fitting = Math.floor(length / (1 + PAUSE_RATIO) / SLOT_MINUTES) * SLOT_MINUTES;
    const chunk = Math.min(remaining, fitting);
    if (chunk < MIN_SPLIT_CHUNK && chunk < remaining) continue;
    if (chunk <= 0 || chunk + pauseFor(chunk) > length) continue;
    placement.push({ interval: index, start: interval.start, minutes: chunk, pause: pauseFor(chunk) });
    remaining -= chunk;
  }
  return remaining === 0 ? placement : null;
}

export function buildDayPlan(input: {
  now: Date;
  window: DayWindow;
  tasks: PlanTaskInput[];
  events: PlanFixedBlock[];
  defaultMinutes?: number;
}): DayPlan {
  const window = normalizeDayWindow(input.window);
  const windowStart = atClock(input.now, parseClock(window.start)!);
  const windowEnd = atClock(input.now, parseClock(window.end)!);
  const from = new Date(Math.max(ceilToSlot(input.now).getTime(), windowStart.getTime()));
  const fallbackMinutes = input.defaultMinutes ?? DEFAULT_TASK_MINUTES;

  const sizedTasks = input.tasks.map((task) => {
    const known = task.estimatedMinutes !== null && task.estimatedMinutes > 0;
    return { ...task, minutes: known ? Math.round(task.estimatedMinutes!) : fallbackMinutes, estimated: !known };
  });
  const eventEntries: PlanEntry[] = input.events
    .filter((event) => event.end > from && event.start < windowEnd)
    .map((event) => ({ kind: "event", id: event.id, title: event.title, start: event.start, end: event.end }));

  if (from >= windowEnd) {
    return {
      status: sizedTasks.length ? "encerrado" : "sem_tarefas",
      windowStart,
      windowEnd,
      from: windowEnd,
      entries: [],
      overflow: sizedTasks.map(({ id, title, minutes, estimated, mustFinishToday }) => ({ id, title, minutes, estimated, mustFinishToday })),
      freeMinutes: 0,
      plannedMinutes: 0,
      shortfallMinutes: 0,
      finishesAt: null,
    };
  }

  const intervals = freeIntervals(from, windowEnd, input.events);
  const freeMinutes = intervals.reduce((sum, interval) => sum + minutesBetween(interval.start, interval.end), 0);
  const entries: PlanEntry[] = [...eventEntries];
  const overflow: PlanOverflowTask[] = [];
  let plannedMinutes = 0;

  for (const task of sizedTasks) {
    const placement = placeContiguous(intervals, task.minutes) ?? placeSplit(intervals, task.minutes);
    if (!placement) {
      overflow.push({ id: task.id, title: task.title, minutes: task.minutes, estimated: task.estimated, mustFinishToday: task.mustFinishToday });
      continue;
    }
    placement.forEach((piece, index) => {
      const taskEnd = new Date(piece.start.getTime() + piece.minutes * MINUTE);
      const pauseEnd = new Date(taskEnd.getTime() + piece.pause * MINUTE);
      entries.push({
        kind: "task",
        id: task.id,
        title: task.title,
        start: piece.start,
        end: taskEnd,
        minutes: piece.minutes,
        estimated: task.estimated,
        ...(placement.length > 1 ? { part: { index: index + 1, total: placement.length } } : {}),
      });
      entries.push({ kind: "pause", start: taskEnd, end: pauseEnd });
      intervals[piece.interval] = { start: pauseEnd, end: intervals[piece.interval]!.end };
    });
    plannedMinutes += task.minutes;
  }

  entries.sort((a, b) => a.start.getTime() - b.start.getTime() || (a.kind === "event" ? -1 : 1));
  const taskEnds = entries.filter((entry) => entry.kind === "task").map((entry) => entry.end.getTime());

  return {
    // Só "não fecha" quando sobra tarefa atrasada ou com prazo hoje; as demais podem esperar.
    status: sizedTasks.length === 0 ? "sem_tarefas" : overflow.some((task) => task.mustFinishToday) ? "nao_cabe" : "cabe",
    windowStart,
    windowEnd,
    from,
    entries,
    overflow,
    freeMinutes,
    plannedMinutes,
    shortfallMinutes: overflow.filter((task) => task.mustFinishToday).reduce((sum, task) => sum + task.minutes + pauseFor(task.minutes), 0),
    finishesAt: taskEnds.length ? new Date(Math.max(...taskEnds)) : null,
  };
}

/** "1h30", "45 min" */
export function formatPlanMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

/** Hora do convite para fechar o dia: 1 hora antes do fim da janela. */
export function isClosingTime(now: Date, window: DayWindow): boolean {
  const normalized = normalizeDayWindow(window);
  const end = atClock(now, parseClock(normalized.end)!);
  const opens = new Date(end.getTime() - 60 * MINUTE);
  return now >= opens && now.getTime() < end.getTime() + 3 * 60 * MINUTE;
}
