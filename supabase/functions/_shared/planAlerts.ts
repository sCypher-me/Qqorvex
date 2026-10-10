// Avisos push do plano do dia (backlog §4, Hoje): só para conflito real na agenda ou prazo em risco,
// dentro do horário disponível da pessoa, e uma única vez por problema. Lógica pura — o
// `send-notifications` busca os dados, chama `computePlanAlerts` e registra as chaves enviadas.
import { buildDayPlan, defaultTaskMinutes, normalizeDayWindow, parseClock, type DayWindow } from "./dayPlan.ts";

export interface AlertTask {
  id: string;
  title: string;
  status: "nao_iniciado" | "em_andamento" | "concluido";
  priority: "alta" | "media" | "baixa" | "sem_prioridade";
  due_date: string | null;
  created_at: string;
  estimated_minutes: number | null;
  /** Tem pré-requisito ainda aberto: não dá para fazer agora, então não entra no plano. */
  blocked: boolean;
}

export interface AlertEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export interface PlanAlert {
  /** Chaves deste aviso em notification_alert_log; nenhuma delas pode ter sido enviada antes. */
  keys: string[];
  title: string;
  body: string;
  url: string;
}

const PRIORITY_WEIGHT: Record<AlertTask["priority"], number> = { alta: 0, media: 1, baixa: 2, sem_prioridade: 3 };

/** Mesma seleção e ordem de `selectDayPlanTasks` (módulo de Tarefas); há teste de paridade. */
export function selectPlanTasks(tasks: AlertTask[], date: string): AlertTask[] {
  return tasks
    .filter((task) => task.status !== "concluido" && !task.blocked && ((task.due_date !== null && task.due_date <= date) || task.status === "em_andamento"))
    .sort((a, b) => {
      const inProgress = Number(b.status === "em_andamento") - Number(a.status === "em_andamento");
      if (inProgress) return inProgress;
      const dueA = a.due_date ?? "9999-12-31";
      const dueB = b.due_date ?? "9999-12-31";
      if (dueA !== dueB) return dueA < dueB ? -1 : 1;
      const priority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (priority) return priority;
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    });
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

/**
 * Converte um instante para um Date cujos campos *locais* (`getHours()`, `getDate()`…) são o relógio
 * de parede do fuso pedido — é o que o planejador espera. Funciona em qualquer fuso do runtime.
 */
export function toWallClock(instant: Date, timeZone: string): Date {
  const p = zonedParts(instant, timeZone);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Diferença entre o relógio do fuso e o UTC naquele instante (Brasília: -3 h). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Pares de compromissos com horário que se sobrepõem de verdade (sem contar margens) a partir de `from`. */
export function findEventConflicts(events: AlertEvent[], from: Date): Array<{ first: AlertEvent; second: AlertEvent; start: Date }> {
  const upcoming = events.filter((event) => event.end > from).sort((a, b) => a.start.getTime() - b.start.getTime());
  const conflicts: Array<{ first: AlertEvent; second: AlertEvent; start: Date }> = [];
  for (let i = 0; i < upcoming.length; i += 1) {
    for (let j = i + 1; j < upcoming.length; j += 1) {
      const first = upcoming[i]!;
      const second = upcoming[j]!;
      if (second.start >= first.end) break;
      const start = new Date(Math.max(first.start.getTime(), second.start.getTime(), from.getTime()));
      const end = new Date(Math.min(first.end.getTime(), second.end.getTime()));
      if (end > start) conflicts.push({ first, second, start });
    }
  }
  return conflicts;
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function listTitles(titles: string[]): string {
  const quoted = titles.map((title) => `“${title}”`);
  if (quoted.length <= 2) return quoted.join(" e ");
  return `${quoted.slice(0, 2).join(", ")} e mais ${quoted.length - 2}`;
}

/** Dentro do horário disponível do dia (a mesma janela do plano). Fora dele, nenhum aviso sai. */
export function isWithinWindow(now: Date, window: DayWindow): boolean {
  const normalized = normalizeDayWindow(window);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= parseClock(normalized.start)! && minutes < parseClock(normalized.end)!;
}

/**
 * Decide os avisos de agora. `now`, `events` e o resultado do plano estão no relógio local do
 * runtime (no servidor, já convertidos com `toWallClock`). Retorna só problemas ainda não avisados.
 */
export function computePlanAlerts(input: {
  now: Date;
  today: string;
  window: DayWindow;
  tasks: AlertTask[];
  events: AlertEvent[];
  alreadySent: Set<string>;
}): PlanAlert[] {
  const window = normalizeDayWindow(input.window);
  if (!isWithinWindow(input.now, window)) return [];
  const alerts: PlanAlert[] = [];

  for (const conflict of findEventConflicts(input.events, input.now)) {
    const ids = [conflict.first.id, conflict.second.id].sort();
    const key = `conflito:${input.today}:${ids[0]}:${ids[1]}`;
    if (input.alreadySent.has(key)) continue;
    alerts.push({
      keys: [key],
      title: "Conflito na agenda",
      body: `“${conflict.first.title}” e “${conflict.second.title}” se sobrepõem às ${clock(conflict.start)}.`,
      url: "/planejar/agenda",
    });
  }

  const plan = buildDayPlan({
    now: input.now,
    window,
    defaultMinutes: defaultTaskMinutes(input.tasks.map((task) => task.estimated_minutes ?? 0)),
    tasks: selectPlanTasks(input.tasks, input.today).map((task) => ({
      id: task.id,
      title: task.title,
      estimatedMinutes: task.estimated_minutes,
      mustFinishToday: task.due_date !== null && task.due_date <= input.today,
    })),
    events: input.events.map((event) => ({ id: event.id, title: event.title, start: event.start, end: event.end })),
  });

  if (plan.status === "nao_cabe") {
    const atRisk = plan.overflow.filter((task) => task.mustFinishToday);
    const fresh = atRisk.filter((task) => !input.alreadySent.has(`prazo:${input.today}:${task.id}`));
    if (fresh.length > 0) {
      alerts.push({
        keys: fresh.map((task) => `prazo:${input.today}:${task.id}`),
        title: "Prazo em risco hoje",
        body: `${listTitles(fresh.map((task) => task.title))} ${fresh.length === 1 ? "não cabe" : "não cabem"} no seu horário até ${window.end}. Toque para reorganizar o dia.`,
        url: "/#plano-do-dia",
      });
    }
  }

  return alerts;
}
