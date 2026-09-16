import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createCheckin,
  createGoal,
  createMilestone,
  deleteGoal,
  linkGoalHabit,
  listGoalHabitRelations,
  listGoals,
  listMilestones,
  toggleMilestone,
  unlinkGoalHabit,
  updateGoalProgressSource,
  updateGoalStatus,
} from "../repository";
import type { Goal, NewGoalInput } from "../types";

const GOALS_KEY = ["goals"] as const;
const milestonesKey = (goalId: string) => ["goal-milestones", goalId] as const;
const GOAL_HABIT_RELATIONS_KEY = ["goal-habit-relations"] as const;

export function useGoals(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: GOALS_KEY, queryFn: () => listGoals(client) });
  return { goals: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateGoal(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewGoalInput) => createGoal(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useUpdateGoalStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, status }: { goalId: string; status: Goal["status"] }) =>
      updateGoalStatus(client, goalId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useDeleteGoal(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(client, goalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useUpdateGoalProgressSource(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, source }: { goalId: string; source: { accountId: string; targetAmount: number } | null }) =>
      updateGoalProgressSource(client, goalId, source),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useMilestones(client: SupabaseClient<Database>, goalId: string) {
  const query = useQuery({ queryKey: milestonesKey(goalId), queryFn: () => listMilestones(client, goalId) });
  return { milestones: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateMilestone(client: SupabaseClient<Database>, goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createMilestone(client, goalId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: milestonesKey(goalId) }),
  });
}

export function useToggleMilestone(client: SupabaseClient<Database>, goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, isDone }: { milestoneId: string; isDone: boolean }) =>
      toggleMilestone(client, milestoneId, isDone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: milestonesKey(goalId) }),
  });
}

export function useCreateCheckin(client: SupabaseClient<Database>, goalId: string) {
  return useMutation({
    mutationFn: (input: { note?: string; progressPercentSnapshot?: number }) =>
      createCheckin(client, goalId, input),
  });
}

/** "A relação meta↔hábito existe no banco mas a UI ainda não a expõe" — agora expõe. */
export function useGoalHabitRelations(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: GOAL_HABIT_RELATIONS_KEY, queryFn: () => listGoalHabitRelations(client) });
  return { relations: query.data ?? [], isLoading: query.isLoading };
}

export function useLinkGoalHabit(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, habitId }: { goalId: string; habitId: string }) => linkGoalHabit(client, goalId, habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOAL_HABIT_RELATIONS_KEY }),
  });
}

export function useUnlinkGoalHabit(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, habitId }: { goalId: string; habitId: string }) => unlinkGoalHabit(client, goalId, habitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOAL_HABIT_RELATIONS_KEY }),
  });
}
