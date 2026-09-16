import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addHabitToRoutine,
  createRoutine,
  deleteRoutine,
  listHabitLogsForDate,
  listRoutineHabits,
  listRoutines,
  logHabit,
  removeHabitFromRoutine,
} from "../repository";
import type { HabitLogState } from "../types";

const ROUTINES_KEY = ["routines"] as const;
const ROUTINE_HABITS_KEY = ["routine-habits"] as const;
const habitLogsByDateKey = (logDate: string) => ["habit-logs-by-date", logDate] as const;

export function useRoutines(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ROUTINES_KEY, queryFn: () => listRoutines(client) });
  return { routines: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateRoutine(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createRoutine(client, userId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}

export function useDeleteRoutine(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routineId: string) => deleteRoutine(client, routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
      queryClient.invalidateQueries({ queryKey: ROUTINE_HABITS_KEY });
    },
  });
}

export function useRoutineHabits(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ROUTINE_HABITS_KEY, queryFn: () => listRoutineHabits(client) });
  return { relations: query.data ?? [], isLoading: query.isLoading };
}

export function useAddHabitToRoutine(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, habitId }: { routineId: string; habitId: string }) =>
      addHabitToRoutine(client, routineId, habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINE_HABITS_KEY }),
  });
}

export function useRemoveHabitFromRoutine(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, habitId }: { routineId: string; habitId: string }) =>
      removeHabitFromRoutine(client, routineId, habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINE_HABITS_KEY }),
  });
}

export function useHabitLogsForDate(client: SupabaseClient<Database>, logDate: string) {
  const query = useQuery({ queryKey: habitLogsByDateKey(logDate), queryFn: () => listHabitLogsForDate(client, logDate) });
  return { logs: query.data ?? [], isLoading: query.isLoading };
}

export function useLogHabitForDate(client: SupabaseClient<Database>, logDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, state }: { habitId: string; state: HabitLogState }) => logHabit(client, habitId, logDate, state),
    onSuccess: (_, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: habitLogsByDateKey(logDate) });
      queryClient.invalidateQueries({ queryKey: ["habit-logs", habitId] });
    },
  });
}
