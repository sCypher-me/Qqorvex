import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addDependency,
  createRecurringTask,
  createTask,
  deleteTask,
  listActiveTasks,
  listAllTasks,
  listDependencyEdges,
  listRecurringTasks,
  updateRecurringTaskStatus,
  updateTaskCancelled,
  updateTaskStatus,
} from "../repository";
import { deriveTaskConditions, wouldCreateCycle } from "../service";
import type { NewTaskInput, RecurringTask, TaskRecurrenceFrequency, TaskStatus } from "../types";

const TASKS_KEY = ["tasks"] as const;
const ALL_TASKS_KEY = ["tasks", "all"] as const;
const DEPENDENCIES_KEY = ["task-dependencies"] as const;
const RECURRING_TASKS_KEY = ["recurring-tasks"] as const;

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

export function useTasks(client: SupabaseClient<Database>) {
  const tasksQuery = useQuery({ queryKey: TASKS_KEY, queryFn: () => listActiveTasks(client) });
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

export function useUpdateTaskStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(client, taskId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(client, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useRecurringTasks(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: RECURRING_TASKS_KEY, queryFn: () => listRecurringTasks(client) });
  return { recurringTasks: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateRecurringTask(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; frequency: TaskRecurrenceFrequency; startDate: string }) =>
      createRecurringTask(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_TASKS_KEY }),
  });
}

export function useUpdateRecurringTaskStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecurringTask["status"] }) => updateRecurringTaskStatus(client, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_TASKS_KEY }),
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
