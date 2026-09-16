import type { SupabaseClient, Database } from "@qqorvex/database";
import { awardXp } from "@qqorvex/module-gamificacao";
import type {
  Goal,
  GoalMilestone,
  GoalCheckin,
  Habit,
  HabitLog,
  HabitLogState,
  NewGoalInput,
  NewHabitInput,
  Routine,
} from "./types";
import { toGoalInsert, toHabitInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listGoals(client: Client): Promise<Goal[]> {
  const { data, error } = await client.from("goals").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createGoal(client: Client, userId: string, input: NewGoalInput): Promise<Goal> {
  const { data, error } = await client.from("goals").insert(toGoalInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateGoalStatus(client: Client, goalId: string, status: Goal["status"]): Promise<Goal> {
  const { data, error } = await client
    .from("goals")
    .update({ status, completed_at: status === "concluida" ? new Date().toISOString() : null })
    .eq("id", goalId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Vincula/desvincula uma meta a uma Conta de Finanças pra progresso "derivado" — ou volta pra
 * `binario` quando desvinculada (`accountId`/`targetAmount` nulos limpam a vinculação).
 */
export async function updateGoalProgressSource(
  client: Client,
  goalId: string,
  input: { accountId: string; targetAmount: number } | null,
): Promise<Goal> {
  const { data, error } = await client
    .from("goals")
    .update({
      progress_type: input ? "derivado" : "binario",
      progress_source_account_id: input?.accountId ?? null,
      progress_numeric_target: input?.targetAmount ?? null,
    })
    .eq("id", goalId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(client: Client, goalId: string): Promise<void> {
  const { error } = await client.from("goals").delete().eq("id", goalId);
  if (error) throw error;
}

export async function listMilestones(client: Client, goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await client
    .from("goal_milestones")
    .select("*")
    .eq("goal_id", goalId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createMilestone(client: Client, goalId: string, title: string): Promise<GoalMilestone> {
  const { data, error } = await client
    .from("goal_milestones")
    .insert({ goal_id: goalId, title })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleMilestone(client: Client, milestoneId: string, isDone: boolean): Promise<GoalMilestone> {
  const { data, error } = await client
    .from("goal_milestones")
    .update({ is_done: isDone })
    .eq("id", milestoneId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Todo check-in registrado é um sinal real de engajamento — premia XP sempre, sem checar estado anterior (é sempre um insert novo, nunca upsert). */
export async function createCheckin(
  client: Client,
  goalId: string,
  input: { note?: string; progressPercentSnapshot?: number },
): Promise<GoalCheckin> {
  const { data, error } = await client
    .from("goal_checkins")
    .insert({
      goal_id: goalId,
      note: input.note ?? null,
      progress_percent_snapshot: input.progressPercentSnapshot ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: goal } = await client.from("goals").select("user_id").eq("id", goalId).single();
  if (goal) await awardXp(client, goal.user_id, "habit_or_goal_checkin");

  return data;
}

export async function listHabits(client: Client): Promise<Habit[]> {
  const { data, error } = await client.from("habits").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createHabit(client: Client, userId: string, input: NewHabitInput): Promise<Habit> {
  const { data, error } = await client.from("habits").insert(toHabitInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateHabitStatus(client: Client, habitId: string, status: Habit["status"]): Promise<Habit> {
  const { data, error } = await client
    .from("habits")
    .update({ status })
    .eq("id", habitId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHabit(client: Client, habitId: string): Promise<void> {
  const { error } = await client.from("habits").delete().eq("id", habitId);
  if (error) throw error;
}

export async function listHabitLogs(client: Client, habitId: string): Promise<HabitLog[]> {
  const { data, error } = await client
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .order("log_date", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Upsert por (habit_id, log_date): registrar de novo no mesmo dia substitui o registro anterior
 * em vez de criar duplicata (a unique constraint do banco garante isso). Premia XP só na
 * transição pra "concluido" (nunca em "parcial"/"pulado", nunca de novo se já estava
 * "concluido" no mesmo dia) — mesma lógica de "confere o estado anterior antes de premiar" de
 * Tarefas/Biblioteca (docs/decisions/gamification-core-design.md).
 */
export async function logHabit(
  client: Client,
  habitId: string,
  logDate: string,
  state: HabitLogState,
): Promise<HabitLog> {
  const { data: before } = await client
    .from("habit_logs")
    .select("state")
    .eq("habit_id", habitId)
    .eq("log_date", logDate)
    .maybeSingle();

  const { data, error } = await client
    .from("habit_logs")
    .upsert({ habit_id: habitId, log_date: logDate, state }, { onConflict: "habit_id,log_date" })
    .select("*")
    .single();
  if (error) throw error;

  if (before?.state !== "concluido" && state === "concluido") {
    const { data: habit } = await client.from("habits").select("user_id").eq("id", habitId).single();
    if (habit) await awardXp(client, habit.user_id, "habit_or_goal_checkin");
  }

  return data;
}

export async function linkGoalHabit(client: Client, goalId: string, habitId: string): Promise<void> {
  const { error } = await client.from("goal_habit_relations").insert({ goal_id: goalId, habit_id: habitId });
  if (error) throw error;
}

export async function listGoalHabitRelations(
  client: Client,
): Promise<Array<{ goal_id: string; habit_id: string }>> {
  const { data, error } = await client.from("goal_habit_relations").select("goal_id, habit_id");
  if (error) throw error;
  return data;
}

export async function unlinkGoalHabit(client: Client, goalId: string, habitId: string): Promise<void> {
  const { error } = await client.from("goal_habit_relations").delete().eq("goal_id", goalId).eq("habit_id", habitId);
  if (error) throw error;
}

/**
 * "Rotina agrupa hábitos para check-off em conjunto." Rotina nunca copia o hábito — só referencia
 * via `routine_habits`, uma junção N:N (mesmo padrão de `goal_habit_relations`).
 */
export async function listRoutines(client: Client): Promise<Routine[]> {
  const { data, error } = await client.from("routines").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createRoutine(client: Client, userId: string, name: string): Promise<Routine> {
  const { data, error } = await client.from("routines").insert({ user_id: userId, name }).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteRoutine(client: Client, routineId: string): Promise<void> {
  const { error } = await client.from("routines").delete().eq("id", routineId);
  if (error) throw error;
}

export async function addHabitToRoutine(client: Client, routineId: string, habitId: string): Promise<void> {
  const { error } = await client.from("routine_habits").insert({ routine_id: routineId, habit_id: habitId });
  if (error) throw error;
}

export async function removeHabitFromRoutine(client: Client, routineId: string, habitId: string): Promise<void> {
  const { error } = await client
    .from("routine_habits")
    .delete()
    .eq("routine_id", routineId)
    .eq("habit_id", habitId);
  if (error) throw error;
}

export async function listRoutineHabits(client: Client): Promise<Array<{ routine_id: string; habit_id: string }>> {
  const { data, error } = await client.from("routine_habits").select("routine_id, habit_id");
  if (error) throw error;
  return data;
}

/** Todos os registros de hábito do usuário numa data — RLS já restringe aos próprios hábitos. */
export async function listHabitLogsForDate(client: Client, logDate: string): Promise<HabitLog[]> {
  const { data, error } = await client.from("habit_logs").select("*").eq("log_date", logDate);
  if (error) throw error;
  return data;
}
