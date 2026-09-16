import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createHabit, deleteHabit, listHabitLogs, listHabits, logHabit, updateHabitStatus } from "../repository";
import type { Habit, HabitLogState, NewHabitInput } from "../types";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitLogsKey(habitId) }),
  });
}
