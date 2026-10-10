import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  BADGE_CATALOG,
  computeLevelProgress,
  getGamificationStats,
  getMyDailyChallenges,
  getTitleForLevel,
  localDateKey,
  swapMyDailyChallenge,
  toTodayChallenges,
  getDailyChallengeDefinition,
  type TodayChallenge,
} from "@qqorvex/module-gamificacao";
import type { ToolDefinition } from "../types";

type Client = SupabaseClient<Database>;

const SLOT_LABEL = ["fácil", "fácil", "médio", "difícil"];

function describeChallenge(challenge: TodayChallenge): string {
  const { definition } = challenge;
  const state = challenge.completedAt ? "concluído" : `${challenge.progress}/${definition.target}`;
  return `- [posição ${challenge.slot} · ${SLOT_LABEL[challenge.slot] ?? definition.difficulty}] ${definition.title} — ${state} (+${definition.rewardXp} XP)`;
}

export function createGamificacaoTools(client: Client, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_gamification_summary",
      description: "Consulta nível, XP, título, progresso das conquistas e desafios do dia do usuário",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const [stats, rows] = await Promise.all([getGamificationStats(client, userId), getMyDailyChallenges(client)]);
        const level = computeLevelProgress(stats.xp);
        const challenges = toTodayChallenges(rows);
        const achievementLines = BADGE_CATALOG.map((badge) => "- " + badge.label + ": " + (badge.isUnlocked?.(stats) ? "conquistada" : "em progresso"));
        return {
          summary: [
            "Nível " + level.level + " · " + stats.xp + " XP · título " + getTitleForLevel(level.level),
            "Próximo nível: " + (level.xpForNextLevel - stats.xp) + " XP restantes (" + level.progressPercent + "% do nível atual)",
            "",
            "Desafios de hoje (opcionais; deixar de fazer não tira nada):",
            ...challenges.map(describeChallenge),
            "",
            "Conquistas:",
            ...achievementLines,
          ].join("\n"),
          data: { stats, level, challenges },
        };
      },
    },
    {
      name: "list_daily_challenges",
      description: "Lista os desafios de hoje da pessoa (sugeridos pelo que ela usa no app), com a posição e o progresso de cada um",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const challenges = toTodayChallenges(await getMyDailyChallenges(client));
        return { summary: "Desafios de hoje (" + localDateKey() + "):\n" + challenges.map(describeChallenge).join("\n"), data: challenges };
      },
    },
    {
      name: "swap_daily_challenge",
      description:
        "Troca um desafio de hoje por outro do mesmo nível, quando a pessoa pedir (ex.: não tem livro para ler hoje). Use a posição mostrada em list_daily_challenges (0 e 1 fácil, 2 médio, 3 difícil). Desafio já concluído não troca. Trocar não tira XP nem progresso.",
      parameters: {
        type: "object",
        properties: { slot: { type: "number", description: "Posição do desafio: 0, 1, 2 ou 3" } },
        required: ["slot"],
      },
      requiresConfirmation: true,
      preview(args) {
        const slot = Number(args.slot);
        return {
          title: "Trocar desafio de hoje",
          fields: [{ label: "Desafio", value: `Posição ${slot} (${SLOT_LABEL[slot] ?? "?"})` }],
          note: "Entra outro desafio do mesmo nível. Trocar não tira XP nem progresso.",
        };
      },
      async execute(args) {
        const slot = Math.round(Number(args.slot));
        if (!(slot >= 0 && slot <= 3)) return { summary: "Não troquei: a posição precisa ser 0, 1, 2 ou 3.", ok: false };
        try {
          const nextKey = await swapMyDailyChallenge(client, slot);
          const next = getDailyChallengeDefinition(nextKey);
          return { summary: `Desafio trocado. Novo desafio: ${next?.title ?? nextKey} (+${next?.rewardXp ?? "?"} XP).`, data: { slot, challengeKey: nextKey } };
        } catch (error) {
          return { summary: "Não troquei o desafio: " + (error instanceof Error ? error.message : "erro desconhecido"), ok: false };
        }
      },
    },
  ];
}
