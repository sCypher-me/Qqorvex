import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createHabit, deleteHabit, listHabitLogs, listHabits, logHabit, updateHabit, updateHabitStatus, listHabitLogsInRange, deleteHabitLog } from "../repository";
import type { Habit, HabitEditInput, HabitLogState, NewHabitInput } from "../types";

const HABITS_KEY = ["habits"] as const;
const habitLogsKey = (habitId: string) => ["habit-logs", habitId] as const;

export function useHabits(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: HABITS_KEY, queryFn: () => listHabits(client) });
  return { habits: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateHabit(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewHabitInput) => createHabit(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export function useUpdateHabit(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, input }: { habitId: string; input: HabitEditInput }) => updateHabit(client, habitId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export function useUpdateHabitStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, status }: { habitId: string; status: Habit["status"] }) =>
      updateHabitStatus(client, habitId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export function useDeleteHabit(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => deleteHabit(client, habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export function useHabitLogs(client: SupabaseClient<Database>, habitId: string) {
  const query = useQuery({ queryKey: habitLogsKey(habitId), queryFn: () => listHabitLogs(client, habitId) });
  return { logs: query.data ?? [], isLoading: query.isLoading };
}

export function useLogHabit(client: SupabaseClient<Database>, habitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logDate, state }: { logDate: string; state: HabitLogState }) =>
      logHabit(client, habitId, logDate, state),
    onSuccess: () => invalidateHabitLogs(queryClient),
  });
}

const HABIT_LOG_KEY_PREFIXES = new Set(["habit-logs", "habit-logs-by-date", "habit-logs-range", "hoje"]);

function invalidateHabitLogs(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ predicate: (query) => HABIT_LOG_KEY_PREFIXES.has(String(query.queryKey[0])) });
}

/** Registros de todos os hábitos num intervalo (painel do dia, mapa de calor, resumo semanal). */
export function useHabitLogsInRange(client: SupabaseClient<Database>, fromDate: string, toDate: string) {
  const query = useQuery({ queryKey: ["habit-logs-range", fromDate, toDate], queryFn: () => listHabitLogsInRange(client, fromDate, toDate) });
  return { logs: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** Marca/desmarca um hábito num dia, de qualquer tela. */
export function useToggleHabitLog(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, logDate, done }: { habitId: string; logDate: string; done: boolean }) => {
      if (done) await logHabit(client, habitId, logDate, "concluido");
      else await deleteHabitLog(client, habitId, logDate);
    },
    onSuccess: () => invalidateHabitLogs(queryClient),
  });
}

/** Define o registro de um dia (feito, parcial, pulado) ou o apaga (`null`). */
export function useSetHabitLog(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, logDate, state }: { habitId: string; logDate: string; state: HabitLogState | null }) => {
      if (state) await logHabit(client, habitId, logDate, state);
      else await deleteHabitLog(client, habitId, logDate);
    },
    onSuccess: () => invalidateHabitLogs(queryClient),
  });
}
