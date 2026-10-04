import type { SupabaseClient, Database } from "@qqorvex/database";
import { getDailyChallenges, localDateKey } from "./dailyChallenges";
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

export async function syncGamificationBadges(client: Client, userId: string): Promise<void> {
  const previousBadges = await listUnlockedBadges(client, userId);
  const { error } = await client.rpc("sync_my_gamification_badges");
  if (error) throw error;

  const currentBadges = await listUnlockedBadges(client, userId);
  const previousKeys = new Set(previousBadges.map((badge) => badge.badge_key));
  const newBadgeKeys = currentBadges.filter((badge) => !previousKeys.has(badge.badge_key)).map((badge) => badge.badge_key);
  if (newBadgeKeys.length > 0) emitGamificationUpdated(userId);
}

/**
 * Avança os desafios do dia ligados à ação. O catálogo é determinístico por data (o mesmo em todo
 * dispositivo); o servidor guarda o progresso e concede o bônus uma única vez por desafio.
 */
async function recordDailyChallengeAction(client: Client, action: GamificationAction, challengeDate = localDateKey()): Promise<void> {
  try {
    for (const challenge of getDailyChallenges(challengeDate).filter((item) => item.action === action)) {
      const { error } = await client.rpc("gamification_progress_daily_challenge", {
        p_challenge_date: challengeDate,
        p_challenge_key: challenge.key,
        p_target: challenge.target,
        p_reward_xp: challenge.rewardXp,
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error("Falha ao atualizar o desafio diário (ação principal não foi afetada):", err);
  }
}

/**
 * Concede o XP e o contador da ação (incremento atômico no servidor, com o XP de cada ação
 * definido lá), avança os desafios do dia e desbloqueia as insígnias que passaram a valer. Nunca
 * lança: quem chama (repository de outro módulo) precisa que a ação principal (concluir a tarefa
 * etc.) nunca falhe por causa da gamificação.
 */
export async function awardXp(client: Client, userId: string, action: GamificationAction): Promise<void> {
  try {
    const { error } = await client.rpc("gamification_record_action", { p_action: action });
    if (error) throw error;
    await recordDailyChallengeAction(client, action);
    await syncGamificationBadges(client, userId);
    emitGamificationUpdated(userId);
  } catch (err) {
    console.error("Falha ao conceder XP de gamificação (ação principal não foi afetada):", err);
  }
}

async function recordMilestone(client: Client, userId: string, milestone: "checkin_day" | "quiz_90_plus"): Promise<void> {
  const { error } = await client.rpc("gamification_record_milestone", { p_milestone: milestone });
  if (error) throw error;
  await syncGamificationBadges(client, userId);
  emitGamificationUpdated(userId);
}

/** Registra um dia de check-in diário (quem chama garante que a data ainda não tinha check-in). */
export async function recordCheckinDay(client: Client, userId: string): Promise<void> {
  try {
    await recordMilestone(client, userId, "checkin_day");
  } catch (err) {
    console.error("Falha ao registrar o dia de check-in para as conquistas:", err);
  }
}

/** Registra uma tentativa de quiz com aproveitamento mínimo de 90%. */
export async function recordHighAccuracyQuiz(client: Client, userId: string): Promise<void> {
  try {
    await recordMilestone(client, userId, "quiz_90_plus");
  } catch (err) {
    console.error("Falha ao registrar o quiz de alto aproveitamento para as conquistas:", err);
  }
}
