import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  GAMIFICATION_UPDATED_EVENT,
  getGamificationStats,
  listDailyChallengeHistory,
  listDailyChallengeProgress,
  listUnlockedBadges,
} from "../repository";
import { BADGE_CATALOG, computeLevelProgress, getTitleForLevel } from "../service";
import { SPECIAL_BADGE_CATALOG } from "../specialBadges";
import { shiftLocalDateKey } from "../dailyChallenges";

const STATS_KEY = ["gamification-stats"] as const;
const BADGES_KEY = ["gamification-badges"] as const;

export function useGamificationStats(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...STATS_KEY, userId],
    queryFn: () => getGamificationStats(client, userId),
    staleTime: 15_000,
  });

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId !== userId) return;
      void queryClient.invalidateQueries({ queryKey: [...STATS_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [...BADGES_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: ["gamification-daily-progress", userId] });
      void queryClient.invalidateQueries({ queryKey: ["gamification-daily-history", userId] });
    };

    window.addEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate);
  }, [queryClient, userId]);

  const stats = query.data;
  const progress = stats ? computeLevelProgress(stats.xp) : null;
  return {
    stats,
    progress,
    title: progress ? getTitleForLevel(progress.level) : null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUnlockedBadges(client: SupabaseClient<Database>, userId: string, isOwner = false) {
  const query = useQuery({
    queryKey: [...BADGES_KEY, userId],
    queryFn: async () => {
      const { error } = await client.rpc("sync_my_gamification_badges");
      if (error) throw error;
      return listUnlockedBadges(client, userId);
    },
    staleTime: 15_000,
  });
  const unlockedAtByKey = new Map((query.data ?? []).map((b) => [b.badge_key, b.unlocked_at] as const));
  const catalog = [
    ...BADGE_CATALOG,
    ...SPECIAL_BADGE_CATALOG.map((badge) => ({
      ...badge,
      counterField: undefined,
      target: undefined,
      isUnlocked: undefined,
    })),
  ];
  const badges = catalog.map((badge) => ({
    ...badge,
    isUnlockedForUser: isOwner || unlockedAtByKey.has(badge.key),
    unlockedAt: unlockedAtByKey.get(badge.key) ?? null,
  }));
  return { badges, isLoading: query.isLoading, error: query.error };
}

export function useDailyChallengeProgress(client: SupabaseClient<Database>, userId: string, challengeDate: string) {
  const query = useQuery({
    queryKey: ["gamification-daily-progress", userId, challengeDate],
    queryFn: () => listDailyChallengeProgress(client, userId, challengeDate),
    staleTime: 15_000,
  });
  const progressByKey = new Map((query.data ?? []).map((progress) => [progress.challenge_key, progress] as const));
  return { progressByKey, isLoading: query.isLoading, error: query.error };
}

export function useDailyChallengeHistory(
  client: SupabaseClient<Database>,
  userId: string,
  todayKey: string,
  enabled = false,
) {
  const query = useQuery({
    queryKey: ["gamification-daily-history", userId, todayKey],
    queryFn: () => listDailyChallengeHistory(client, userId, shiftLocalDateKey(todayKey, -7), todayKey),
    enabled,
    staleTime: 15_000,
  });
  return { progress: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
