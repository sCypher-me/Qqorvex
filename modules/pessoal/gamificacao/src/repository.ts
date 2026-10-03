import type { SupabaseClient, Database } from "@qqorvex/database";
import { getDailyChallenges, localDateKey } from "./dailyChallenges";
import { XP_BY_ACTION } from "./service";
import { GAMIFICATION_COUNTER_FIELD } from "./types";
import type { DailyChallengeProgress, GamificationAction, GamificationStats, UserBadge } from "./types";

type Client = SupabaseClient<Database>;

export const GAMIFICATION_UPDATED_EVENT = "qqorvex:gamification-updated";

function emitGamificationUpdated(userId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT, { detail: { userId } }));
}

const DEFAULT_STATS: Omit<GamificationStats, "user_id" | "updated_at"> = {
  xp: 0,
  tasks_completed: 0,
  habit_or_goal_checkins: 0,
  quizzes_completed: 0,
  library_items_completed: 0,
  checkin_days_completed: 0,
  quizzes_90_plus: 0,
};

export async function getGamificationStats(client: Client, userId: string): Promise<GamificationStats> {
  const { data, error } = await client.from("gamification_stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data
    ? { ...DEFAULT_STATS, ...data }
    : { user_id: userId, updated_at: new Date().toISOString(), ...DEFAULT_STATS };
}

export async function listUnlockedBadges(client: Client, userId: string): Promise<UserBadge[]> {
  const { data, error } = await client.from("user_badges").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function listDailyChallengeProgress(
  client: Client,
  userId: string,
  challengeDate: string,
): Promise<DailyChallengeProgress[]> {
  const { data, error } = await client
    .from("user_daily_challenge_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_date", challengeDate);
  if (error) throw error;
  return data;
}

export async function listDailyChallengeHistory(
  client: Client,
  userId: string,
  startDate: string,
  endDateExclusive: string,
): Promise<DailyChallengeProgress[]> {
  const { data, error } = await client
    .from("user_daily_challenge_progress")
    .select("*")
    .eq("user_id", userId)
    .gte("challenge_date", startDate)
    .lt("challenge_date", endDateExclusive)
    .order("challenge_date", { ascending: false });
  if (error) throw error;
  return data;
}

async function unlockEligibleBadges(client: Client): Promise<void> {
  const { error } = await client.rpc("sync_my_gamification_badges");
  if (error) throw error;
}

async function awardBonusXp(client: Client, userId: string, bonusXp: number): Promise<void> {
  if (bonusXp <= 0) return;
  const current = await getGamificationStats(client, userId);
  const { error } = await client.from("gamification_stats").upsert(
    {
      user_id: userId,
      xp: current.xp + bonusXp,
      tasks_completed: current.tasks_completed,
      habit_or_goal_checkins: current.habit_or_goal_checkins,
      quizzes_completed: current.quizzes_completed,
      library_items_completed: current.library_items_completed,
      checkin_days_completed: current.checkin_days_completed,
      quizzes_90_plus: current.quizzes_90_plus,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Atualiza o desafio diário correspondente à ação e concede o bônus de dificuldade uma única vez. */
async function recordDailyChallengeAction(
  client: Client,
  userId: string,
  action: GamificationAction,
  challengeDate = localDateKey(),
): Promise<void> {
  try {
    const challenges = getDailyChallenges(challengeDate).filter((challenge) => challenge.action === action);
    if (challenges.length === 0) return;

    const existing = await listDailyChallengeProgress(client, userId, challengeDate);
    const progressByKey = new Map(existing.map((progress) => [progress.challenge_key, progress] as const));
    let bonusXp = 0;

    for (const challenge of challenges) {
      const previous = progressByKey.get(challenge.key);
      if (previous?.completed_at) continue;

      const nextProgress = Math.min(challenge.target, (previous?.progress ?? 0) + 1);
      const completedAt = nextProgress >= challenge.target ? previous?.completed_at ?? new Date().toISOString() : null;
      const { error } = await client.from("user_daily_challenge_progress").upsert(
        {
          user_id: userId,
          challenge_date: challengeDate,
          challenge_key: challenge.key,
          progress: nextProgress,
          completed_at: completedAt,
        },
        { onConflict: "user_id,challenge_date,challenge_key" },
      );
      if (error) throw error;

      if (completedAt && !previous?.completed_at) bonusXp += challenge.rewardXp;
    }

    await awardBonusXp(client, userId, bonusXp);
  } catch (err) {
    console.error("Falha ao atualizar o desafio diário (ação principal não foi afetada):", err);
  }
}

/**
 * Lê o estado atual (ou parte de zero se o usuário nunca ganhou XP), soma o XP e o contador da
 * ação, e faz upsert — evita uma migration/RPC de "incremento atômico" que não vale a pena pra
 * um app de usuário único. Depois confere o catálogo de badges e desbloqueia as que passaram a
 * valer com o novo total. Nunca lança: quem chama (repository de outro módulo) precisa que a
 * ação principal (concluir a tarefa, etc.) nunca falhe por causa de um bug aqui.
 */
export async function awardXp(client: Client, userId: string, action: GamificationAction): Promise<void> {
  try {
    const current = await getGamificationStats(client, userId);
    const counterField = GAMIFICATION_COUNTER_FIELD[action];
    const updated = {
      user_id: userId,
      xp: current.xp + XP_BY_ACTION[action],
      tasks_completed: current.tasks_completed,
      habit_or_goal_checkins: current.habit_or_goal_checkins,
      quizzes_completed: current.quizzes_completed,
      library_items_completed: current.library_items_completed,
      checkin_days_completed: current.checkin_days_completed,
      quizzes_90_plus: current.quizzes_90_plus,
    };
    updated[counterField] = current[counterField] + 1;

    const { error } = await client
      .from("gamification_stats")
      .upsert(updated, { onConflict: "user_id" });
    if (error) throw error;

    await unlockEligibleBadges(client);
    await recordDailyChallengeAction(client, userId, action);
    emitGamificationUpdated(userId);
  } catch (err) {
    console.error("Falha ao conceder XP de gamificação (ação principal não foi afetada):", err);
  }
}

/** Registra um dia de check-in diário, sem duplicar a mesma data. */
export async function recordCheckinDay(client: Client, userId: string): Promise<void> {
  try {
    const current = await getGamificationStats(client, userId);
    const { error } = await client
      .from("gamification_stats")
      .upsert(
        {
          user_id: userId,
          xp: current.xp,
          tasks_completed: current.tasks_completed,
          habit_or_goal_checkins: current.habit_or_goal_checkins,
          quizzes_completed: current.quizzes_completed,
          library_items_completed: current.library_items_completed,
          checkin_days_completed: current.checkin_days_completed + 1,
          quizzes_90_plus: current.quizzes_90_plus,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    await unlockEligibleBadges(client);
    emitGamificationUpdated(userId);
  } catch (err) {
    console.error("Falha ao registrar o dia de check-in para as conquistas:", err);
  }
}

/** Registra uma tentativa de quiz com aproveitamento mínimo de 90%. */
export async function recordHighAccuracyQuiz(client: Client, userId: string): Promise<void> {
  try {
    const current = await getGamificationStats(client, userId);
    const { error } = await client
      .from("gamification_stats")
      .upsert(
        {
          user_id: userId,
          xp: current.xp,
          tasks_completed: current.tasks_completed,
          habit_or_goal_checkins: current.habit_or_goal_checkins,
          quizzes_completed: current.quizzes_completed,
          library_items_completed: current.library_items_completed,
          checkin_days_completed: current.checkin_days_completed,
          quizzes_90_plus: current.quizzes_90_plus + 1,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    await unlockEligibleBadges(client);
    emitGamificationUpdated(userId);
  } catch (err) {
    console.error("Falha ao registrar o quiz de alto aproveitamento para as conquistas:", err);
  }
}
