import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Produtividade & Tarefas é a única fonte de verdade de tarefas do Qqorvex.
 * Regra obrigatória: o Kanban tem exatamente 3 estados de fluxo (task_status).
 * "Atrasada"/"Bloqueada" são condições derivadas (calculadas aqui), nunca estados
 * adicionais do Kanban — não persistir como coluna nova.
 */
export type Task = Tables<"tasks">;
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type ChecklistItem = Tables<"task_checklist_items">;
export type RecurringTask = Tables<"recurring_tasks">;
export type TaskRecurrenceFrequency = RecurringTask["frequency"];

export interface TaskWithConditions extends Task {
  isOverdue: boolean;
  isBlocked: boolean;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  startDate?: string;
  parentTaskId?: string;
  tags?: string[];
  estimatedMinutes?: number;
}

export function toTaskInsert(userId: string, input: NewTaskInput): TablesInsert<"tasks"> {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? "sem_prioridade",
    due_date: input.dueDate ?? null,
    start_date: input.startDate ?? null,
    parent_task_id: input.parentTaskId ?? null,
    tags: input.tags ?? [],
    estimated_minutes: input.estimatedMinutes ?? null,
  };
}
