import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  BADGE_CATALOG,
  computeLevelProgress,
  getDailyChallenges,
  getGamificationStats,
  getTitleForLevel,
  listDailyChallengeProgress,
  localDateKey,
} from "@qqorvex/module-gamificacao";
import type { ToolDefinition } from "../types";

type Client = SupabaseClient<Database>;

export function createGamificacaoTools(client: Client, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_gamification_summary",
      description: "Consulta nível, XP, título, progresso das conquistas e desafios diários do usuário",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const challengeDate = localDateKey();
        const [stats, dailyProgress] = await Promise.all([
          getGamificationStats(client, userId),
          listDailyChallengeProgress(client, userId, challengeDate),
        ]);
        const level = computeLevelProgress(stats.xp);
        const challenges = getDailyChallenges(challengeDate);
        const progressByKey = new Map(dailyProgress.map((item) => [item.challenge_key, item] as const));
        const challengeLines = challenges.map((challenge) => {
          const current = progressByKey.get(challenge.key)?.progress ?? 0;
          return "- [" + (current >= challenge.target ? "concluído" : current + "/" + challenge.target) + "] " + challenge.title + " (+" + challenge.rewardXp + " XP)";
        });
        const achievementLines = BADGE_CATALOG.map((badge) => "- " + badge.label + ": " + (badge.isUnlocked?.(stats) ? "conquistada" : "em progresso"));
        return {
          summary: [
            "Nível " + level.level + " · " + stats.xp + " XP · título " + getTitleForLevel(level.level),
            "Próximo nível: " + (level.xpForNextLevel - stats.xp) + " XP restantes (" + level.progressPercent + "% do nível atual)",
            "",
            "Desafios de hoje:",
            ...challengeLines,
            "",
            "Conquistas:",
            ...achievementLines,
          ].join("\n"),
          data: { stats, level, challenges, dailyProgress },
        };
      },
    },
    {
      name: "list_daily_challenges",
      description: "Lista os desafios gerados para hoje e o progresso de cada um",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const challengeDate = localDateKey();
        const [progress, challenges] = await Promise.all([
          listDailyChallengeProgress(client, userId, challengeDate),
          Promise.resolve(getDailyChallenges(challengeDate)),
        ]);
        const progressByKey = new Map(progress.map((item) => [item.challenge_key, item] as const));
        const lines = challenges.map((challenge) => {
          const current = progressByKey.get(challenge.key)?.progress ?? 0;
          return "- " + challenge.difficulty + ": " + challenge.title + " — " + current + "/" + challenge.target + " (" + challenge.rewardXp + " XP)";
        });
        return { summary: "Desafios de hoje (" + challengeDate + "):\n" + lines.join("\n"), data: challenges };
      },
    },
  ];
}
