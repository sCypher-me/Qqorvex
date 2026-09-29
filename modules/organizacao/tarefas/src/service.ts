import type { Task, TaskRecurrenceFrequency, TaskWithConditions } from "./types";

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
