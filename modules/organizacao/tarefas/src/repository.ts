import type { SupabaseClient, Database, TablesUpdate } from "@qqorvex/database";
import { awardXp } from "@qqorvex/module-gamificacao";
import { computeNextTaskOccurrenceDate } from "./service";
import type { NewTaskInput, RecurringTask, Task, TaskRecurrenceFrequency, TaskStatus } from "./types";
import { toTaskInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listActiveTasks(client: Client): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("is_cancelled", false)
    .is("parent_task_id", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** "Todas as Tarefas" — ao contrário do Kanban, inclui canceladas e subtarefas. */
export async function listAllTasks(client: Client): Promise<Task[]> {
  const { data, error } = await client.from("tasks").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listDependencyEdges(
  client: Client,
): Promise<Array<{ task_id: string; depends_on_task_id: string }>> {
  const { data, error } = await client.from("task_dependencies").select("task_id, depends_on_task_id");
  if (error) throw error;
  return data;
}

export async function createTask(client: Client, userId: string, input: NewTaskInput): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
    .insert(toTaskInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Confere o status anterior antes de gravar pra premiar XP só na transição pra "concluido" —
 * desfazer e refazer a mesma conclusão não deve dobrar o XP (docs/decisions/gamification-core-design.md).
 */
export async function updateTaskStatus(client: Client, taskId: string, status: TaskStatus): Promise<Task> {
  const { data: before, error: beforeError } = await client.from("tasks").select("status, user_id").eq("id", taskId).single();
  if (beforeError) throw beforeError;

  const { data, error } = await client
    .from("tasks")
    .update({
      status,
      completed_at: status === "concluido" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw error;

  if (before.status !== "concluido" && status === "concluido") {
    await awardXp(client, before.user_id, "task_completed");
  }

  return data;
}

/**
 * Atualização genérica por ID — diferente de `updateTaskStatus`/`updateTaskCancelled` (que só
 * mexem em um campo cada), esta cobre o caso do Context Engine da Vex: "muda o prazo disso pra
 * amanhã" chega como um ID exato + campos parciais, não um dos fluxos de UI já existentes.
 */
export async function updateTask(
  client: Client,
  taskId: string,
  updates: { title?: string; dueDate?: string | null; status?: TaskStatus },
): Promise<Task> {
  const patch: TablesUpdate<"tasks"> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    patch.completed_at = updates.status === "concluido" ? new Date().toISOString() : null;
  }
  const { data, error } = await client.from("tasks").update(patch).eq("id", taskId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTask(client: Client, taskId: string): Promise<void> {
  const { error } = await client.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

/** Cancelar não é um estado do Kanban (regra do módulo) — é a flag `is_cancelled`, gerenciável só em "Todas as Tarefas". */
export async function updateTaskCancelled(client: Client, taskId: string, isCancelled: boolean): Promise<Task> {
  const { data, error } = await client.from("tasks").update({ is_cancelled: isCancelled }).eq("id", taskId).select("*").single();
  if (error) throw error;
  return data;
}

export async function addDependency(client: Client, taskId: string, dependsOnTaskId: string): Promise<void> {
  const { error } = await client
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });
  if (error) throw error;
}

export async function listRecurringTasks(client: Client): Promise<RecurringTask[]> {
  const { data, error } = await client
    .from("recurring_tasks")
    .select("*")
    .order("next_occurrence_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createRecurringTask(
  client: Client,
  userId: string,
  input: { title: string; description?: string; priority?: Task["priority"]; frequency: TaskRecurrenceFrequency; startDate: string },
): Promise<RecurringTask> {
  const { data, error } = await client
    .from("recurring_tasks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "sem_prioridade",
      frequency: input.frequency,
      start_date: input.startDate,
      next_occurrence_date: input.startDate,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringTaskStatus(
  client: Client,
  id: string,
  status: RecurringTask["status"],
): Promise<RecurringTask> {
  const { data, error } = await client.from("recurring_tasks").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * "Cada ocorrência é uma tarefa vinculada à recorrência." Cria a ocorrência como tarefa comum e
 * independente (editar/completar/apagar depois não afeta a série) e avança
 * `next_occurrence_date` — a recorrência nunca é, em si, uma tarefa.
 */
export async function generateTaskOccurrence(client: Client, userId: string, recurring: RecurringTask): Promise<Task> {
  const { data: task, error: taskError } = await client
    .from("tasks")
    .insert({
      user_id: userId,
      title: recurring.title,
      description: recurring.description,
      priority: recurring.priority,
      due_date: recurring.next_occurrence_date,
    })
    .select("*")
    .single();
  if (taskError) throw taskError;

  const { error: updateError } = await client
    .from("recurring_tasks")
    .update({ next_occurrence_date: computeNextTaskOccurrenceDate(recurring.next_occurrence_date, recurring.frequency) })
    .eq("id", recurring.id);
  if (updateError) throw updateError;

  return task;
}
