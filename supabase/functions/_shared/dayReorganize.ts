/**
 * Reorganização do dia (backlog do Hoje): quando há conflito na agenda ou o dia não fecha, propõe
 * um conjunto de mudanças em tarefas *e* compromissos — nada é alterado aqui. A interface mostra a
 * lista com cada item marcado, a pessoa desmarca o que não quer e confirma o resto num botão.
 *
 * Só compromissos *flexíveis* são movidos: blocos de foco e, sem link de reunião nem local, os de
 * estudos e pessoais (coisas que a pessoa marca para si). Reuniões e compromissos com outras pessoas
 * nunca entram na proposta; um conflito entre eles aparece como aviso para resolver na Agenda.
 */
import { buildDayPlan, normalizeDayWindow, parseClock, type DayPlan, type DayWindow, type PlanTaskInput } from "./dayPlan.ts";
import { findEventConflicts } from "./planAlerts.ts";

export interface ReorgEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  flexible: boolean;
}

export interface ReorgTask extends PlanTaskInput {
  dueDate: string | null;
}

export type ReorgChange =
  | { kind: "task_due"; id: string; title: string; from: string | null; to: string }
  | { kind: "event_move"; id: string; title: string; from: { start: Date; end: Date }; to: { start: Date; end: Date }; reason: "conflito" | "liberar_tempo" };

export interface Reorganization {
  changes: ReorgChange[];
  /** Conflitos entre compromissos que não são flexíveis: só a pessoa resolve (na Agenda). */
  unresolvedConflicts: Array<{ first: ReorgEvent; second: ReorgEvent; start: Date }>;
  /** Como o dia fica se todas as mudanças forem aplicadas. */
  planAfter: DayPlan;
}

const DAY_MS = 24 * 60 * 60_000;
const SLOT_MS = 5 * 60_000;

/** Compromisso que a pessoa marcou para si e pode mudar de horário sem combinar com ninguém. */
export function isFlexibleEvent(event: { category: string | null; meeting_link?: string | null; location?: string | null; is_all_day?: boolean }): boolean {
  if (event.is_all_day) return false;
  if (event.category === "foco") return true;
  return (event.category === "estudos" || event.category === "pessoal") && !event.meeting_link && !event.location;
}

function atClock(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function overlaps(start: Date, end: Date, other: { start: Date; end: Date }): boolean {
  return start < other.end && other.start < end;
}

/** Primeiro horário livre hoje, a partir de agora e dentro da janela, para um compromisso dessa duração. */
function nextFreeSlot(durationMs: number, busy: Array<{ start: Date; end: Date }>, from: Date, windowEnd: Date): { start: Date; end: Date } | null {
  let cursor = new Date(Math.ceil(from.getTime() / SLOT_MS) * SLOT_MS);
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  while (cursor.getTime() + durationMs <= windowEnd.getTime()) {
    const end = new Date(cursor.getTime() + durationMs);
    const blocking = sorted.find((item) => overlaps(cursor, end, item));
    if (!blocking) return { start: cursor, end };
    cursor = new Date(Math.ceil(blocking.end.getTime() / SLOT_MS) * SLOT_MS);
  }
  return null;
}

export function proposeReorganization(input: {
  now: Date;
  window: DayWindow;
  tomorrow: string;
  tasks: ReorgTask[];
  events: ReorgEvent[];
  defaultMinutes?: number;
}): Reorganization {
  const window = normalizeDayWindow(input.window);
  const windowEnd = atClock(input.now, parseClock(window.end)!);
  const dayIsOver = input.now >= windowEnd;
  const changes: ReorgChange[] = [];
  const unresolvedConflicts: Reorganization["unresolvedConflicts"] = [];
  const placed = new Map(input.events.map((event) => [event.id, { start: event.start, end: event.end }]));
  const currentEvents = () => input.events.map((event) => ({ ...event, ...placed.get(event.id)! }));
  const moveEvent = (event: ReorgEvent, to: { start: Date; end: Date }, reason: "conflito" | "liberar_tempo") => {
    placed.set(event.id, to);
    changes.push({ kind: "event_move", id: event.id, title: event.title, from: { start: event.start, end: event.end }, to, reason });
  };

  // 1. Conflitos: move o compromisso flexível para o próximo horário livre de hoje (ou amanhã, mesmo horário).
  if (!dayIsOver) {
    for (const conflict of findEventConflicts(input.events, input.now)) {
      const candidates = [conflict.second, conflict.first].filter((event) => event.flexible && !changes.some((change) => change.id === event.id));
      const mover = candidates[0];
      if (!mover) {
        if (!conflict.first.flexible && !conflict.second.flexible) unresolvedConflicts.push(conflict);
        continue;
      }
      const duration = mover.end.getTime() - mover.start.getTime();
      const others = currentEvents().filter((event) => event.id !== mover.id);
      const slot = nextFreeSlot(duration, others, input.now, windowEnd);
      moveEvent(mover, slot ?? { start: new Date(mover.start.getTime() + DAY_MS), end: new Date(mover.end.getTime() + DAY_MS) }, "conflito");
    }
  }

  const plan = () =>
    buildDayPlan({
      now: input.now,
      window,
      tasks: input.tasks.filter((task) => !changes.some((change) => change.kind === "task_due" && change.id === task.id)),
      // O planejador só considera o que cai dentro da janela de hoje; o que foi para amanhã sai sozinho.
      events: currentEvents(),
      defaultMinutes: input.defaultMinutes,
    });

  // 2. Dia que não fecha: adia para amanhã blocos flexíveis de hoje, um por vez, enquanto ajudar.
  let current = plan();
  if (!dayIsOver && current.status === "nao_cabe") {
    const flexibleToday = input.events
      .filter((event) => event.flexible && event.start >= input.now && event.start < windowEnd && !changes.some((change) => change.id === event.id))
      .sort((a, b) => b.end.getTime() - b.start.getTime() - (a.end.getTime() - a.start.getTime()));
    for (const event of flexibleToday) {
      if (current.status !== "nao_cabe") break;
      const before = current.shortfallMinutes;
      placed.set(event.id, { start: new Date(event.start.getTime() + DAY_MS), end: new Date(event.end.getTime() + DAY_MS) });
      const attempt = plan();
      if (attempt.shortfallMinutes < before) {
        placed.set(event.id, { start: event.start, end: event.end });
        moveEvent(event, { start: new Date(event.start.getTime() + DAY_MS), end: new Date(event.end.getTime() + DAY_MS) }, "liberar_tempo");
        current = attempt;
      } else {
        placed.set(event.id, { start: event.start, end: event.end });
      }
    }
  }

  // 3. O que ainda não cabe e vence hoje (ou está atrasado): prazo para amanhã.
  const dueByTask = new Map(input.tasks.map((task) => [task.id, task.dueDate]));
  for (const task of current.overflow.filter((item) => item.mustFinishToday)) {
    changes.push({ kind: "task_due", id: task.id, title: task.title, from: dueByTask.get(task.id) ?? null, to: input.tomorrow });
  }

  return { changes, unresolvedConflicts, planAfter: plan() };
}
