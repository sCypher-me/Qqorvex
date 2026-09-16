import type { Task, TaskRecurrenceFrequency, TaskWithConditions } from "./types";

type DependencyEdge = { task_id: string; depends_on_task_id: string };

/**
 * "Atrasada" e "Bloqueada" são condições calculadas, nunca colunas de estado do Kanban
 * (regra explícita do módulo). Recalcular sempre que tasks/edges mudarem.
 */
export function deriveTaskConditions(tasks: Task[], edges: DependencyEdge[]): TaskWithConditions[] {
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  const today = new Date().toISOString().slice(0, 10);

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
export function computeNextTaskOccurrenceDate(currentDate: string, frequency: TaskRecurrenceFrequency): string {
  const date = new Date(`${currentDate}T00:00:00`);
  if (frequency === "diaria") date.setDate(date.getDate() + 1);
  else if (frequency === "semanal") date.setDate(date.getDate() + 7);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}
