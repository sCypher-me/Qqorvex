import type { GamificationAction, GamificationStats } from "./types";

/** XP concedido por ação — números de partida, fáceis de recalibrar depois (só código, sem migration). */
export const XP_BY_ACTION: Record<GamificationAction, number> = {
  task_completed: 10,
  habit_or_goal_checkin: 5,
  quiz_completed: 20,
  library_item_completed: 15,
};

/**
 * Curva de nível: XP acumulado necessário pra alcançar um nível, começando em nível 1 com 0 XP.
 * `50 × (nível-1) × nível` — nível 2 exige 100 XP total, nível 3 exige 300, nível 4 exige 600...
 * cada nível pede mais que o anterior, sem teto.
 */
export function xpRequiredForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

/** Nível é sempre derivado do XP total — nunca guardado, pra nunca divergir. */
export function computeLevel(xp: number): number {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export function computeLevelProgress(xp: number): LevelProgress {
  const level = computeLevel(xp);
  const xpForCurrentLevel = xpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const span = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = span > 0 ? Math.round(((xp - xpForCurrentLevel) / span) * 100) : 100;
  return { level, xp, xpForCurrentLevel, xpForNextLevel, progressPercent };
}

const TITLE_BY_MIN_LEVEL: [number, string][] = [
  [20, "Mestre"],
  [10, "Consistente"],
  [5, "Dedicado"],
  [1, "Iniciante"],
];

/** Um título fixo por faixa de nível — automático, sem escolha do usuário. */
export function getTitleForLevel(level: number): string {
  for (const [minLevel, title] of TITLE_BY_MIN_LEVEL) {
    if (level >= minLevel) return title;
  }
  return "Iniciante";
}

export interface BadgeDefinition {
  key: string;
  label: string;
  description: string;
  isUnlocked: (stats: GamificationStats) => boolean;
}

/** Catálogo fixo pra v1 — cada badge checada contra um contador de `gamification_stats`. */
export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    key: "10_tarefas",
    label: "Produtivo",
    description: "Concluiu 10 tarefas.",
    isUnlocked: (stats) => stats.tasks_completed >= 10,
  },
  {
    key: "5_checkins",
    label: "Consistente",
    description: "Fez 5 check-ins de hábito ou meta.",
    isUnlocked: (stats) => stats.habit_or_goal_checkins >= 5,
  },
  {
    key: "3_quizzes",
    label: "Estudioso",
    description: "Respondeu 3 quizzes em Estudos.",
    isUnlocked: (stats) => stats.quizzes_completed >= 3,
  },
  {
    key: "5_biblioteca",
    label: "Leitor",
    description: "Concluiu 5 itens da Biblioteca.",
    isUnlocked: (stats) => stats.library_items_completed >= 5,
  },
];
