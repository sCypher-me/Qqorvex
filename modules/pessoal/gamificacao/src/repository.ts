import type { SupabaseClient, Database } from "@qqorvex/database";
import { BADGE_CATALOG, XP_BY_ACTION } from "./service";
import { GAMIFICATION_COUNTER_FIELD } from "./types";
import type { GamificationAction, GamificationStats, UserBadge } from "./types";

type Client = SupabaseClient<Database>;

const DEFAULT_STATS: Omit<GamificationStats, "user_id" | "updated_at"> = {
  xp: 0,
  tasks_completed: 0,
  habit_or_goal_checkins: 0,
  quizzes_completed: 0,
  library_items_completed: 0,
};

export async function getGamificationStats(client: Client, userId: string): Promise<GamificationStats> {
  const { data, error } = await client.from("gamification_stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ?? { user_id: userId, updated_at: new Date().toISOString(), ...DEFAULT_STATS };
}

export async function listUnlockedBadges(client: Client, userId: string): Promise<UserBadge[]> {
  const { data, error } = await client.from("user_badges").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
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
    };
    updated[counterField] = current[counterField] + 1;

    const { data: newStats, error } = await client
      .from("gamification_stats")
      .upsert(updated, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw error;

    const unlocked = await listUnlockedBadges(client, userId);
    const unlockedKeys = new Set(unlocked.map((b) => b.badge_key));
    const toUnlock = BADGE_CATALOG.filter((badge) => !unlockedKeys.has(badge.key) && badge.isUnlocked(newStats));
    if (toUnlock.length > 0) {
      const { error: badgeError } = await client
        .from("user_badges")
        .insert(toUnlock.map((badge) => ({ user_id: userId, badge_key: badge.key })));
      if (badgeError) throw badgeError;
    }
  } catch (err) {
    console.error("Falha ao conceder XP de gamificação (ação principal não foi afetada):", err);
  }
}
