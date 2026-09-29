import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addDependency,
  createTaskChecklistItem,
  createRecurringTask,
  createTask,
  deleteTask,
  deleteTaskChecklistItem,
  listActiveTasks,
  listAllTasks,
  listDependencyEdges,
  listTaskChecklist,
  listRecurringTasks,
  materializeDueRecurringTasks,
  removeDependency,
  updateRecurringTaskStatus,
  updateTaskCancelled,
  updateTask,
  updateTaskChecklistItem,
  updateTaskStatus,
} from "../repository";
import { deriveTaskConditions, wouldCreateCycle } from "../service";
import type { NewTaskInput, RecurringTask, Task, TaskPriority, TaskRecurrenceFrequency, TaskStatus, TaskUpdateInput } from "../types";

const TASKS_KEY = ["tasks"] as const;
const ALL_TASKS_KEY = ["tasks", "all"] as const;
const DEPENDENCIES_KEY = ["task-dependencies"] as const;
const RECURRING_TASKS_KEY = ["recurring-tasks"] as const;
const CHECKLIST_KEY = ["task-checklist"] as const;

/**
 * "Todas as Tarefas" — mesmo hook shape de `useTasks`, mas sobre `listAllTasks()` (inclui
 * canceladas e subtarefas). `ALL_TASKS_KEY` tem `TASKS_KEY` como prefixo, então as mutations já
 * existentes (que invalidam só `TASKS_KEY`) também invalidam esta consulta automaticamente.
 */
export function useAllTasks(client: SupabaseClient<Database>) {
  const tasksQuery = useQuery({ queryKey: ALL_TASKS_KEY, queryFn: () => listAllTasks(client) });
  const edgesQuery = useQuery({ queryKey: DEPENDENCIES_KEY, queryFn: () => listDependencyEdges(client) });

  const tasksWithConditions =
    tasksQuery.data && edgesQuery.data ? deriveTaskConditions(tasksQuery.data, edgesQuery.data) : [];

  return {
    tasks: tasksWithConditions,
    isLoading: tasksQuery.isLoading || edgesQuery.isLoading,
    error: tasksQuery.error ?? edgesQuery.error,
  };
}

export function useUpdateTaskCancelled(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, isCancelled }: { taskId: string; isCancelled: boolean }) =>
      updateTaskCancelled(client, taskId, isCancelled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useTasks(client: SupabaseClient<Database>, userId: string) {
  const tasksQuery = useQuery({
    queryKey: TASKS_KEY,
    refetchInterval: 60_000,
    queryFn: async () => {
      await materializeDueRecurringTasks(client, userId);
      return listActiveTasks(client);
    },
  });
  const edgesQuery = useQuery({ queryKey: DEPENDENCIES_KEY, queryFn: () => listDependencyEdges(client) });

  const tasksWithConditions =
    tasksQuery.data && edgesQuery.data ? deriveTaskConditions(tasksQuery.data, edgesQuery.data) : [];

  return {
    tasks: tasksWithConditions,
    isLoading: tasksQuery.isLoading || edgesQuery.isLoading,
    error: tasksQuery.error ?? edgesQuery.error,
  };
}

export function useCreateTask(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTaskInput) => createTask(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Atualiza o status com resposta otimista (a lista reage na hora; volta se o servidor falhar). */
export function useUpdateTaskStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(client, taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: TASKS_KEY });
      const completedAt = status === "concluido" ? new Date().toISOString() : null;
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData<Task[]>(key, data.map((task) => (task.id === taskId ? { ...task, status, completed_at: completedAt } : task)));
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(client, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTask(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: TaskUpdateInput }) => updateTask(client, taskId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useTaskChecklist(client: SupabaseClient<Database>, taskId: string | null) {
  const query = useQuery({
    queryKey: [...CHECKLIST_KEY, taskId],
    queryFn: () => listTaskChecklist(client, taskId!),
    enabled: Boolean(taskId),
  });
  return { items: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateTaskChecklistItem(client: SupabaseClient<Database>, taskId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTaskChecklistItem(client, taskId!, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...CHECKLIST_KEY, taskId] }),
  });
}

export function useUpdateTaskChecklistItem(client: SupabaseClient<Database>, taskId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: { title?: string; isDone?: boolean } }) => updateTaskChecklistItem(client, itemId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...CHECKLIST_KEY, taskId] }),
  });
}

export function useDeleteTaskChecklistItem(client: SupabaseClient<Database>, taskId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteTaskChecklistItem(client, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...CHECKLIST_KEY, taskId] }),
  });
}

export function useTaskDependencies(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: DEPENDENCIES_KEY, queryFn: () => listDependencyEdges(client) });
  return { dependencies: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useRemoveDependency(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => removeDependency(client, taskId, dependsOnTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPENDENCIES_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useRecurringTasks(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: RECURRING_TASKS_KEY, queryFn: () => listRecurringTasks(client) });
  return { recurringTasks: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateRecurringTask(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; priority?: TaskPriority; frequency: TaskRecurrenceFrequency; startDate: string }) => {
      const recurring = await createRecurringTask(client, userId, input);
      await materializeDueRecurringTasks(client, userId);
      return recurring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateRecurringTaskStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecurringTask["status"] }) => {
      const recurring = await updateRecurringTaskStatus(client, id, status);
      if (status === "ativa") await materializeDueRecurringTasks(client, recurring.user_id);
      return recurring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useAddDependency(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const edges = await listDependencyEdges(client);
      if (wouldCreateCycle(edges, taskId, dependsOnTaskId)) {
        throw new Error("Essa dependência criaria um ciclo entre tarefas.");
      }
      await addDependency(client, taskId, dependsOnTaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPENDENCIES_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
