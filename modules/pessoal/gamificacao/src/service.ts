import type { AchievementCounterField, GamificationAction, GamificationStats } from "./types";

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
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return 50 * (safeLevel - 1) * safeLevel;
}

function normalizeXp(xp: number): number {
  return Number.isFinite(xp) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(xp))) : 0;
}

/** Nível é sempre derivado do XP total — nunca guardado, pra nunca divergir. */
export function computeLevel(xp: number): number {
  const safeXp = normalizeXp(xp);
  // Resolve a desigualdade 50 × (nível-1) × nível <= XP pela fórmula quadrática.
  // Evita uma varredura linear que poderia congelar a tela se o contador viesse corrompido.
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + safeXp / 12.5)) / 2));
  while (level > 1 && safeXp < xpRequiredForLevel(level)) level--;
  while (safeXp >= xpRequiredForLevel(level + 1)) level++;
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
  const safeXp = normalizeXp(xp);
  const level = computeLevel(safeXp);
  const xpForCurrentLevel = xpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const span = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = span > 0 ? Math.min(100, Math.max(0, Math.round(((safeXp - xpForCurrentLevel) / span) * 100))) : 100;
  return { level, xp: safeXp, xpForCurrentLevel, xpForNextLevel, progressPercent };
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
  /** Título que o usuário desbloqueia junto com a insígnia. */
  title: string;
  /** Arquivo da insígnia exibido no estado bloqueado e conquistado. */
  imageSrc: string;
  /** Contador de `gamification_stats` e meta que a conquista checa. */
  counterField?: AchievementCounterField;
  target?: number;
  /** Requisito de badges especiais que não avançam por contadores de gamificação. */
  progressHint?: string;
  isUnlocked?: (stats: GamificationStats) => boolean;
}

/** Catálogo fixo — cada conquista libera um título e sua insígnia correspondente. */
export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    key: "150_tarefas",
    label: "Produtivo",
    description: "Conclua 150 tarefas para provar consistência na execução.",
    title: "Produtivo",
    imageSrc: "/brand/achievements/achievement-productive-v2.png",
    counterField: "tasks_completed",
    target: 150,
    isUnlocked: (stats) => stats.tasks_completed >= 150,
  },
  {
    key: "30_checkin_days",
    label: "Consistente",
    description: "Faça check-in em 30 dias diferentes.",
    title: "Consistente",
    imageSrc: "/brand/achievements/achievement-consistent-v2.png",
    counterField: "checkin_days_completed",
    target: 30,
    isUnlocked: (stats) => stats.checkin_days_completed >= 30,
  },
  {
    key: "50_quizzes_90_plus",
    label: "Estudioso",
    description: "Conclua 50 quizzes com pelo menos 90% de acerto.",
    title: "Estudioso",
    imageSrc: "/brand/achievements/achievement-scholar-v2.png",
    counterField: "quizzes_90_plus",
    target: 50,
    isUnlocked: (stats) => stats.quizzes_90_plus >= 50,
  },
  {
    key: "50_biblioteca",
    label: "Leitor",
    description: "Conclua 50 itens da Biblioteca.",
    title: "Leitor",
    imageSrc: "/brand/achievements/achievement-reader-v2.png",
    counterField: "library_items_completed",
    target: 50,
    isUnlocked: (stats) => stats.library_items_completed >= 50,
  },
];
