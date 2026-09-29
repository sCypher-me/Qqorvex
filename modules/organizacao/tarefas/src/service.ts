import type { TablesUpdate } from "@qqorvex/database";
import type { RecurringTask, Task, TaskPriority, TaskRecurrenceFrequency, TaskWithConditions } from "./types";

export interface RecurringTaskEditInput {
  title: string;
  priority: TaskPriority;
  frequency: TaskRecurrenceFrequency;
  nextOccurrenceDate: string;
}

/**
 * Edição de uma série: vale da próxima ocorrência em diante (tarefas já geradas não mudam). Mudar
 * a próxima data move também `start_date`, que é a âncora do dia do mês na série mensal — senão a
 * série voltaria ao dia antigo depois da primeira ocorrência. A data nova não pode ficar no
 * passado: a geração recupera datas vencidas uma a uma e criaria várias tarefas de uma vez.
 */
export function toRecurringTaskUpdate(
  current: Pick<RecurringTask, "next_occurrence_date">,
  input: RecurringTaskEditInput,
  today = localDateKey(),
): TablesUpdate<"recurring_tasks"> {
  const dateChanged = input.nextOccurrenceDate !== current.next_occurrence_date;
  if (dateChanged && input.nextOccurrenceDate < today) throw new Error("A próxima data não pode ficar no passado.");
  return {
    title: input.title,
    priority: input.priority,
    frequency: input.frequency,
    next_occurrence_date: input.nextOccurrenceDate,
    ...(dateChanged ? { start_date: input.nextOccurrenceDate } : {}),
  };
}

type DependencyEdge = { task_id: string; depends_on_task_id: string };

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * "Atrasada" e "Bloqueada" são condições calculadas, nunca colunas de estado do Kanban
 * (regra explícita do módulo). Recalcular sempre que tasks/edges mudarem.
 */
export function deriveTaskConditions(tasks: Task[], edges: DependencyEdge[]): TaskWithConditions[] {
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  const today = localDateKey();

  const blockedIds = new Set<string>();
  for (const edge of edges) {
    const dependsOnStatus = statusById.get(edge.depends_on_task_id);
    if (dependsOnStatus && dependsOnStatus !== "concluido") {
      blockedIds.add(edge.task_id);
    }
  }

  return tasks.map((task) => ({
    ...task,
    // `is_cancelled` nunca dava pra aparecer aqui antes (só "Todas as Tarefas" alimenta esta
    // função com tarefas canceladas) — uma cancelada com prazo vencido não é "atrasada".
    isOverdue: Boolean(task.due_date) && task.due_date! < today && task.status !== "concluido" && !task.is_cancelled,
    isBlocked: blockedIds.has(task.id),
  }));
}

/**
 * "Não criar ciclo de dependências; validar isso no módulo." Verifica, antes de inserir
 * uma aresta nova, se ela criaria um ciclo (busca a partir de dependsOnTaskId até taskId).
 */
export function wouldCreateCycle(
  edges: DependencyEdge[],
  taskId: string,
  dependsOnTaskId: string,
): boolean {
  if (taskId === dependsOnTaskId) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.task_id) ?? [];
    list.push(edge.depends_on_task_id);
    adjacency.set(edge.task_id, list);
  }

  const visited = new Set<string>();
  const stack = [dependsOnTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

/**
 * "A frequência determina automaticamente a próxima data" — mesmo espírito de
 * `computeNextOccurrenceDate` em Finanças, mas com as frequências de Tarefas
 * (diária/semanal/mensal, sem dias específicos da semana — corte consciente, ver
 * docs/decisions/tarefas-recorrentes-design.md).
 */
export function computeNextTaskOccurrenceDate(currentDate: string, frequency: TaskRecurrenceFrequency, anchorDate = currentDate): string {
  const [year = 0, month = 1, day = 1] = currentDate.split("-").map(Number);
  const [, , anchorDay = day] = anchorDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (frequency === "diaria") date.setUTCDate(date.getUTCDate() + 1);
  else if (frequency === "semanal") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(anchorDay, lastDay));
    return target.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

/* ───────────────────── Adição inteligente (linguagem natural) ───────────────────── */

export interface ParsedQuickTask {
  title: string;
  dueDate?: string;
  priority?: Task["priority"];
  tags: string[];
  /** Trechos reconhecidos (para mostrar ao usuário o que foi entendido). */
  tokens: Array<{ kind: "date" | "priority" | "tag"; label: string }>;
}

const WEEKDAYS: Array<[RegExp, number]> = [
  [/^domingo$/, 0],
  [/^segunda(-feira)?$/, 1],
  [/^ter[çc]a(-feira)?$/, 2],
  [/^quarta(-feira)?$/, 3],
  [/^quinta(-feira)?$/, 4],
  [/^sexta(-feira)?$/, 5],
  [/^s[áa]bado$/, 6],
];

function keyToDate(key: string): Date {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToKey(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatShortDate(key: string): string {
  return keyToDate(key).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

/**
 * Entende "Pagar luz amanhã !alta #casa": datas relativas (hoje, amanhã, depois de amanhã,
 * dias da semana, "em 3 dias", "semana que vem", "dia 15", "15/10"), prioridade (!alta, !média,
 * !baixa, !!!, !!) e tags (#casa). O que não for reconhecido continua no título.
 */
export function parseQuickTask(input: string, today = localDateKey()): ParsedQuickTask {
  let text = ` ${input.trim()} `;
  const tokens: ParsedQuickTask["tokens"] = [];
  const tags: string[] = [];
  let dueDate: string | undefined;
  let priority: Task["priority"] | undefined;

  text = text.replace(/\s#([\p{L}\p{N}_-]{1,40})(?=\s)/gu, (_, tag: string) => {
    const clean = tag.toLowerCase();
    if (!tags.includes(clean)) {
      tags.push(clean);
      tokens.push({ kind: "tag", label: `#${clean}` });
    }
    return " ";
  });

  text = text.replace(/\s(!alta|!m[ée]dia|!baixa|!!!|!!)(?=\s)/giu, (_, raw: string) => {
    const token = raw.toLowerCase();
    priority = token === "!alta" || token === "!!!" ? "alta" : token === "!baixa" ? "baixa" : "media";
    tokens.push({ kind: "priority", label: priority === "alta" ? "Alta" : priority === "media" ? "Média" : "Baixa" });
    return " ";
  });

  const setDate = (key: string, match: string) => {
    if (dueDate) return false;
    dueDate = key;
    tokens.push({ kind: "date", label: key === today ? "Hoje" : key === addDaysToKey(today, 1) ? "Amanhã" : formatShortDate(key) });
    text = text.replace(match, " ");
    return true;
  };

  const lower = text.toLowerCase();
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string | null]> = [
    [/\s(?:para\s|at[ée]\s)?depois de amanh[ãa](?=\s)/i, () => addDaysToKey(today, 2)],
    [/\s(?:para\s|at[ée]\s)?amanh[ãa](?=\s)/i, () => addDaysToKey(today, 1)],
    [/\s(?:para\s|at[ée]\s)?hoje(?=\s)/i, () => today],
    [/\s(?:em|daqui a)\s(\d{1,3})\sdias?(?=\s)/i, (m) => addDaysToKey(today, Number(m[1]))],
    [/\s(?:na\s|em\s)?(?:pr[óo]xima\s)?semana que vem(?=\s)|\s(?:na\s)?pr[óo]xima semana(?=\s)/i, () => addDaysToKey(today, 7)],
    [/\s(?:no\s|at[ée]\s|para\s)?dia\s(\d{1,2})(?=\s)/i, (m) => {
      const day = Number(m[1]);
      if (day < 1 || day > 31) return null;
      const base = keyToDate(today);
      const candidate = new Date(base.getFullYear(), base.getMonth(), day);
      if (candidate.getDate() !== day || localDateKey(candidate) < today) candidate.setMonth(candidate.getMonth() + 1, day);
      return candidate.getDate() === day ? localDateKey(candidate) : null;
    }],
    [/\s(?:at[ée]\s|para\s|em\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m) => {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const base = keyToDate(today);
      let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : base.getFullYear();
      let candidate = new Date(year, month - 1, day);
      if (candidate.getMonth() !== month - 1) return null;
      if (!m[3] && localDateKey(candidate) < today) {
        year += 1;
        candidate = new Date(year, month - 1, day);
      }
      return localDateKey(candidate);
    }],
  ];
  for (const [regex, resolve] of patterns) {
    const match = lower.match(regex);
    if (!match || match.index === undefined) continue;
    const original = text.slice(match.index, match.index + match[0].length);
    const key = resolve(match);
    if (key && setDate(key, original)) break;
  }

  if (!dueDate) {
    const weekdayMatch = text.match(/\s(?:(na|no|nesta|neste|pr[óo]xima|pr[óo]ximo|at[ée]|para)\s)?(domingo|segunda(?:-feira)?|ter[çc]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado)(?=\s)/i);
    if (weekdayMatch) {
      const word = weekdayMatch[2]!.toLowerCase();
      const target = WEEKDAYS.find(([regex]) => regex.test(word))?.[1];
      if (target !== undefined) {
        const base = keyToDate(today);
        let diff = (target - base.getDay() + 7) % 7;
        if (/pr[óo]xim/i.test(weekdayMatch[1] ?? "") && diff === 0) diff = 7;
        setDate(addDaysToKey(today, diff), weekdayMatch[0]);
      }
    }
  }

  const title = text.replace(/\s+/g, " ").trim();
  return { title, dueDate, priority, tags, tokens };
}

/* ───────────────────── Agrupamento e rótulos ───────────────────── */

export type DueBucket = "atrasadas" | "hoje" | "amanha" | "semana" | "depois" | "sem_prazo";

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  amanha: "Amanhã",
  semana: "Próximos 7 dias",
  depois: "Mais adiante",
  sem_prazo: "Sem prazo",
};

export function dueBucketOf(dueDate: string | null, today = localDateKey()): DueBucket {
  if (!dueDate) return "sem_prazo";
  if (dueDate < today) return "atrasadas";
  if (dueDate === today) return "hoje";
  if (dueDate === addDaysToKey(today, 1)) return "amanha";
  if (dueDate <= addDaysToKey(today, 7)) return "semana";
  return "depois";
}

const PRIORITY_WEIGHT: Record<Task["priority"], number> = { alta: 0, media: 1, baixa: 2, sem_prioridade: 3 };

/** Ordena para ação: prazo mais próximo, depois prioridade, depois criação. */
export function compareTasksForAction(a: Task, b: Task): number {
  const dueA = a.due_date ?? "9999-12-31";
  const dueB = b.due_date ?? "9999-12-31";
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  const priority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (priority !== 0) return priority;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Rótulo curto do prazo ("Hoje", "Amanhã", "sex", "12 out", "Atrasada há 2 dias"). */
export function formatDueLabel(dueDate: string, today = localDateKey()): string {
  if (dueDate === today) return "Hoje";
  if (dueDate === addDaysToKey(today, 1)) return "Amanhã";
  if (dueDate === addDaysToKey(today, -1)) return "Ontem";
  const date = keyToDate(dueDate);
  if (dueDate > today && dueDate <= addDaysToKey(today, 6)) {
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  const sameYear = date.getFullYear() === keyToDate(today).getFullYear();
  return date.toLocaleDateString("pt-BR", sameYear ? { day: "2-digit", month: "short" } : { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}
