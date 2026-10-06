import type { SupabaseClient, Database } from "@qqorvex/database";
import type { DailyChallengeProgress, GamificationStats, UserBadge } from "./types";

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
 * Os gatilhos SQL concedem XP, desafios e marcos dentro da própria gravação do evento-fonte.
 * Depois da gravação, esta função apenas atualiza insígnias e a interface; nunca concede XP.
 */
export async function refreshGamificationAfterSourceWrite(client: Client, userId: string): Promise<void> {
  try {
    await syncGamificationBadges(client, userId);
    emitGamificationUpdated(userId);
  } catch (err) {
    // A gravação principal já foi concluída; falhas de sincronização de badges não podem fazê-la
    // parecer perdida nem pedir ao usuário para repetir a ação.
    console.error("Falha ao atualizar as insígnias de gamificação (a ação principal foi salva):", err);
  }
}
