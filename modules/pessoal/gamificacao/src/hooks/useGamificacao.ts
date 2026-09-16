import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { getGamificationStats, listUnlockedBadges } from "../repository";
import { BADGE_CATALOG, computeLevelProgress, getTitleForLevel } from "../service";

const STATS_KEY = ["gamification-stats"] as const;
const BADGES_KEY = ["gamification-badges"] as const;

export function useGamificationStats(client: SupabaseClient<Database>, userId: string) {
  const query = useQuery({ queryKey: STATS_KEY, queryFn: () => getGamificationStats(client, userId) });
  const stats = query.data;
  const progress = stats ? computeLevelProgress(stats.xp) : null;
  return {
    stats,
    progress,
    title: progress ? getTitleForLevel(progress.level) : null,
    isLoading: query.isLoading,
  };
}

export function useUnlockedBadges(client: SupabaseClient<Database>, userId: string) {
  const query = useQuery({ queryKey: BADGES_KEY, queryFn: () => listUnlockedBadges(client, userId) });
  const unlockedKeys = new Set((query.data ?? []).map((b) => b.badge_key));
  const badges = BADGE_CATALOG.map((badge) => ({ ...badge, isUnlockedForUser: unlockedKeys.has(badge.key) }));
  return { badges, isLoading: query.isLoading };
}
