import type { SupabaseClient, Database, TablesUpdate } from "@qqorvex/database";
import { refreshGamificationAfterSourceWrite } from "@qqorvex/module-gamificacao";
import { computeNextTaskOccurrenceDate, localDateKey, toRecurringTaskUpdate, type RecurringTaskEditInput } from "./service";
import type { ChecklistItem, NewTaskInput, RecurringTask, Task, TaskRecurrenceFrequency, TaskStatus, TaskUpdateInput } from "./types";
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
 * desfazer e refazer a mesma conclusão não deve dobrar o XP.
 */
export async function updateTaskStatus(client: Client, taskId: string, status: TaskStatus): Promise<Task> {
  const { data: before, error: beforeError } = await client.from("tasks").select("status, user_id").eq("id", taskId).single();
  if (beforeError) throw beforeError;

  if (status !== "nao_iniciado" && status !== before.status) {
    const { data: prerequisites, error: prerequisiteError } = await client
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("task_id", taskId);
    if (prerequisiteError) throw prerequisiteError;
    const prerequisiteIds = prerequisites.map((item) => item.depends_on_task_id);
    if (prerequisiteIds.length > 0) {
      const { data: pending, error: pendingError } = await client
        .from("tasks")
        .select("id")
        .in("id", prerequisiteIds)
        .neq("status", "concluido");
      if (pendingError) throw pendingError;
      if (pending.length > 0) throw new Error("Conclua os pré-requisitos antes de avançar esta tarefa.");
    }
  }

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
    await refreshGamificationAfterSourceWrite(client, before.user_id);
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
  updates: TaskUpdateInput,
): Promise<Task> {
  const patch: TablesUpdate<"tasks"> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
  if (updates.startDate !== undefined) patch.start_date = updates.startDate;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.estimatedMinutes !== undefined) patch.estimated_minutes = updates.estimatedMinutes;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    patch.completed_at = updates.status === "concluido" ? new Date().toISOString() : null;
  }
  const { data, error } = await client.from("tasks").update(patch).eq("id", taskId).select("*").single();
  if (error) throw error;
  return data;
}

export async function listTaskChecklist(client: Client, taskId: string): Promise<ChecklistItem[]> {
  const { data, error } = await client.from("task_checklist_items").select("*").eq("task_id", taskId).order("position").order("created_at");
  if (error) throw error;
  return data;
}

export async function createTaskChecklistItem(client: Client, taskId: string, title: string): Promise<ChecklistItem> {
  const { count, error: countError } = await client.from("task_checklist_items").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  if (countError) throw countError;
  const { data, error } = await client.from("task_checklist_items").insert({ task_id: taskId, title: title.trim(), position: count ?? 0 }).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTaskChecklistItem(client: Client, itemId: string, updates: { title?: string; isDone?: boolean }): Promise<ChecklistItem> {
  const patch: TablesUpdate<"task_checklist_items"> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if (updates.isDone !== undefined) patch.is_done = updates.isDone;
  const { data, error } = await client.from("task_checklist_items").update(patch).eq("id", itemId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTaskChecklistItem(client: Client, itemId: string): Promise<void> {
  const { error } = await client.from("task_checklist_items").delete().eq("id", itemId);
  if (error) throw error;
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

export async function removeDependency(client: Client, taskId: string, dependsOnTaskId: string): Promise<void> {
  const { error } = await client.from("task_dependencies").delete().eq("task_id", taskId).eq("depends_on_task_id", dependsOnTaskId);
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
 * Grava a edição só se a série ainda estiver na data que a pessoa abriu — o cron (ou a geração ao
 * abrir Tarefas) pode tê-la avançado nesse meio-tempo, e aí gravar a data antiga duplicaria uma
 * ocorrência.
 */
export async function updateRecurringTask(client: Client, current: RecurringTask, input: RecurringTaskEditInput): Promise<RecurringTask> {
  const { data, error } = await client
    .from("recurring_tasks")
    .update(toRecurringTaskUpdate(current, input))
    .eq("id", current.id)
    .eq("next_occurrence_date", current.next_occurrence_date)
    .select("*")
    .single();
  if (error?.code === "PGRST116") throw new Error("Esta repetição avançou enquanto você editava. Abra de novo para ver a data atual.");
  if (error) throw error;
  return data;
}

function todayDateKey(): string {
  return localDateKey();
}

/**
 * Materializa as ocorrências vencidas para que o Kanban não dependa de o cron ter
 * executado exatamente antes da navegação do usuário. A chave composta da ocorrência
 * mantém este processo seguro mesmo quando ele concorre com o cron.
 */
export async function materializeDueRecurringTasks(
  client: Client,
  userId: string,
  today = todayDateKey(),
): Promise<Task[]> {
  const generated: Task[] = [];
  const maxOccurrencesPerSync = 365;

  while (generated.length < maxOccurrencesPerSync) {
    const { data: recurringTasks, error } = await client
      .from("recurring_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ativa")
      .lte("next_occurrence_date", today)
      .order("next_occurrence_date", { ascending: true });
    if (error) throw error;
    if (recurringTasks.length === 0) break;

    for (const recurring of recurringTasks) {
      if (generated.length >= maxOccurrencesPerSync) break;
      generated.push(await generateTaskOccurrence(client, userId, recurring));
    }
  }

  return generated;
}

/**
 * "Cada ocorrência é uma tarefa vinculada à recorrência." Cria a ocorrência como tarefa comum e
 * independente (editar/completar/apagar depois não afeta a série) e avança
 * `next_occurrence_date` — a recorrência nunca é, em si, uma tarefa.
 */
async function generateTaskOccurrence(client: Client, userId: string, recurring: RecurringTask): Promise<Task> {
  const occurrenceDate = recurring.next_occurrence_date;

  const { data: existingTask, error: existingError } = await client
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("recurring_task_id", recurring.id)
    .eq("recurrence_date", occurrenceDate)
    .maybeSingle();
  if (existingError) throw existingError;

  let task = existingTask;
  if (!task) {
    const { data: createdTask, error: taskError } = await client
      .from("tasks")
      .insert({
        user_id: userId,
        title: recurring.title,
        description: recurring.description,
        priority: recurring.priority,
        due_date: occurrenceDate,
        recurring_task_id: recurring.id,
        recurrence_date: occurrenceDate,
      })
      .select("*")
      .single();

    if (taskError && taskError.code !== "23505") throw taskError;
    task = createdTask;

    // Outra aba ou o cron pode ter criado a mesma ocorrência entre o select e o insert.
    if (!task) {
      const { data: concurrentTask, error: concurrentError } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("recurring_task_id", recurring.id)
        .eq("recurrence_date", occurrenceDate)
        .single();
      if (concurrentError) throw concurrentError;
      task = concurrentTask;
    }
  }

  const { error: updateError } = await client
    .from("recurring_tasks")
    .update({ next_occurrence_date: computeNextTaskOccurrenceDate(occurrenceDate, recurring.frequency, recurring.start_date) })
    .eq("id", recurring.id)
    .eq("next_occurrence_date", occurrenceDate);
  if (updateError) throw updateError;

  return task;
}
