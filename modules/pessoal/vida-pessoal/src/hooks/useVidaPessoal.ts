import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createIdea,
  createPlan,
  createProject,
  deleteIdea,
  deletePlan,
  deleteProject,
  getCheckinForDate,
  linkGoalToPlan,
  linkTaskToProject,
  listIdeas,
  listPlanGoalRelations,
  listPlans,
  listPomodoroSessions,
  listProjectTaskRelations,
  listProjects,
  logPomodoroSession,
  unlinkGoalFromPlan,
  unlinkTaskFromProject,
  updatePlanStatus,
  updateProjectStatus,
  upsertCheckin,
} from "../repository";
import type { CheckinInput, NewIdeaInput, NewPlanInput, NewPomodoroSessionInput, NewProjectInput, Plan, Project } from "../types";

const PLANS_KEY = ["plans"] as const;
const PLAN_GOALS_KEY = ["plan-goals"] as const;
const PROJECTS_KEY = ["projects"] as const;
const PROJECT_TASKS_KEY = ["project-tasks"] as const;
const IDEAS_KEY = ["ideas"] as const;

export function usePlans(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PLANS_KEY, queryFn: () => listPlans(client) });
  return { plans: query.data ?? [], isLoading: query.isLoading };
}

export function useCreatePlan(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPlanInput) => createPlan(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useUpdatePlanStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, status }: { planId: string; status: Plan["status"] }) => updatePlanStatus(client, planId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeletePlan(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deletePlan(client, planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function usePlanGoalRelations(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PLAN_GOALS_KEY, queryFn: () => listPlanGoalRelations(client) });
  return { relations: query.data ?? [], isLoading: query.isLoading };
}

export function useLinkGoalToPlan(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, goalId }: { planId: string; goalId: string }) => linkGoalToPlan(client, planId, goalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAN_GOALS_KEY }),
  });
}

export function useUnlinkGoalFromPlan(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, goalId }: { planId: string; goalId: string }) => unlinkGoalFromPlan(client, planId, goalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAN_GOALS_KEY }),
  });
}

export function useProjects(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PROJECTS_KEY, queryFn: () => listProjects(client) });
  return { projects: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateProject(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewProjectInput) => createProject(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useUpdateProjectStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: Project["status"] }) =>
      updateProjectStatus(client, projectId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useDeleteProject(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(client, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useProjectTaskRelations(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PROJECT_TASKS_KEY, queryFn: () => listProjectTaskRelations(client) });
  return { relations: query.data ?? [], isLoading: query.isLoading };
}

export function useLinkTaskToProject(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) => linkTaskToProject(client, projectId, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_KEY }),
  });
}

export function useUnlinkTaskFromProject(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) => unlinkTaskFromProject(client, projectId, taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_KEY }),
  });
}

export function useIdeas(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: IDEAS_KEY, queryFn: () => listIdeas(client) });
  return { ideas: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateIdea(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewIdeaInput) => createIdea(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IDEAS_KEY }),
  });
}

export function useDeleteIdea(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => deleteIdea(client, ideaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IDEAS_KEY }),
  });
}

const checkinKey = (date: string) => ["daily-checkin", date] as const;
const POMODORO_SESSIONS_KEY = ["pomodoro-sessions"] as const;

export function useTodayCheckin(client: SupabaseClient<Database>, date: string) {
  const query = useQuery({ queryKey: checkinKey(date), queryFn: () => getCheckinForDate(client, date) });
  return { checkin: query.data ?? null, isLoading: query.isLoading };
}

export function useUpsertCheckin(client: SupabaseClient<Database>, userId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckinInput) => upsertCheckin(client, userId, date, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkinKey(date) }),
  });
}

export function usePomodoroSessions(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: POMODORO_SESSIONS_KEY, queryFn: () => listPomodoroSessions(client) });
  return { sessions: query.data ?? [], isLoading: query.isLoading };
}

export function useLogPomodoroSession(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPomodoroSessionInput) => logPomodoroSession(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POMODORO_SESSIONS_KEY }),
  });
}
