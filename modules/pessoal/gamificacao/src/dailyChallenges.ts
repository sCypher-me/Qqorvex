import type { DailyChallengeProgress, GamificationAction } from "./types";

/** Especial fica reservado para desafios criados sob demanda; nunca entra na rotação automática. */
export type DailyChallengeDifficulty = "Fácil" | "Médio" | "Difícil" | "Especial";

export type DailyChallengeDefinition = {
  key: string;
  title: string;
  description: string;
  difficulty: DailyChallengeDifficulty;
  action: GamificationAction;
  href: string;
  actionLabel: string;
  target: number;
  unit: string;
  rewardXp: number;
};

const DAILY_CHALLENGE_XP: Record<DailyChallengeDifficulty, number> = {
  Fácil: 10,
  Médio: 25,
  Difícil: 50,
  Especial: 100,
};

const DAILY_CHALLENGE_POOL: Record<Exclude<DailyChallengeDifficulty, "Especial">, DailyChallengeDefinition[]> = {
  Fácil: [
    {
      key: "task-1",
      title: "Concluir 1 tarefa",
      description: "Tire uma pendência importante do caminho.",
      difficulty: "Fácil",
      action: "task_completed",
      href: "/planejar/tarefas",
      actionLabel: "Abrir tarefas",
      target: 1,
      unit: "tarefa",
      rewardXp: DAILY_CHALLENGE_XP.Fácil,
    },
    {
      key: "checkin-1",
      title: "Fazer 1 check-in de hábito",
      description: "Mantenha um hábito ativo com uma ação simples.",
      difficulty: "Fácil",
      action: "habit_or_goal_checkin",
      href: "/planejar/metas",
      actionLabel: "Abrir metas e hábitos",
      target: 1,
      unit: "check-in",
      rewardXp: DAILY_CHALLENGE_XP.Fácil,
    },
    {
      key: "library-1",
      title: "Concluir 1 item da Biblioteca",
      description: "Feche um ciclo curto de leitura ou acompanhamento.",
      difficulty: "Fácil",
      action: "library_item_completed",
      href: "/conhecimento/biblioteca",
      actionLabel: "Abrir biblioteca",
      target: 1,
      unit: "item",
      rewardXp: DAILY_CHALLENGE_XP.Fácil,
    },
    {
      key: "study-1",
      title: "Responder 1 quiz",
      description: "Transforme uma sessão curta em avanço real.",
      difficulty: "Fácil",
      action: "quiz_completed",
      href: "/conhecimento/estudos",
      actionLabel: "Abrir estudos",
      target: 1,
      unit: "quiz",
      rewardXp: DAILY_CHALLENGE_XP.Fácil,
    },
  ],
  Médio: [
    {
      key: "task-3",
      title: "Concluir 3 tarefas",
      description: "Organize seu ritmo e feche três ciclos do dia.",
      difficulty: "Médio",
      action: "task_completed",
      href: "/planejar/tarefas",
      actionLabel: "Abrir tarefas",
      target: 3,
      unit: "tarefas",
      rewardXp: DAILY_CHALLENGE_XP.Médio,
    },
    {
      key: "library-2",
      title: "Concluir 2 itens da Biblioteca",
      description: "Avance no conhecimento com constância.",
      difficulty: "Médio",
      action: "library_item_completed",
      href: "/conhecimento/biblioteca",
      actionLabel: "Abrir biblioteca",
      target: 2,
      unit: "itens",
      rewardXp: DAILY_CHALLENGE_XP.Médio,
    },
    {
      key: "checkin-2",
      title: "Fazer 2 check-ins",
      description: "Mantenha suas metas e hábitos em movimento.",
      difficulty: "Médio",
      action: "habit_or_goal_checkin",
      href: "/planejar/metas",
      actionLabel: "Abrir metas e hábitos",
      target: 2,
      unit: "check-ins",
      rewardXp: DAILY_CHALLENGE_XP.Médio,
    },
    {
      key: "study-2",
      title: "Responder 2 quizzes",
      description: "Aprofunde o estudo com duas rodadas de prática.",
      difficulty: "Médio",
      action: "quiz_completed",
      href: "/conhecimento/estudos",
      actionLabel: "Abrir estudos",
      target: 2,
      unit: "quizzes",
      rewardXp: DAILY_CHALLENGE_XP.Médio,
    },
  ],
  Difícil: [
    {
      key: "task-5",
      title: "Concluir 5 tarefas",
      description: "Faça uma limpeza consistente na sua lista.",
      difficulty: "Difícil",
      action: "task_completed",
      href: "/planejar/tarefas",
      actionLabel: "Abrir tarefas",
      target: 5,
      unit: "tarefas",
      rewardXp: DAILY_CHALLENGE_XP.Difícil,
    },
    {
      key: "library-3",
      title: "Concluir 3 itens da Biblioteca",
      description: "Feche três ciclos de leitura ou acompanhamento.",
      difficulty: "Difícil",
      action: "library_item_completed",
      href: "/conhecimento/biblioteca",
      actionLabel: "Abrir biblioteca",
      target: 3,
      unit: "itens",
      rewardXp: DAILY_CHALLENGE_XP.Difícil,
    },
    {
      key: "study-3",
      title: "Responder 3 quizzes",
      description: "Teste sua retenção com uma sessão mais exigente.",
      difficulty: "Difícil",
      action: "quiz_completed",
      href: "/conhecimento/estudos",
      actionLabel: "Abrir estudos",
      target: 3,
      unit: "quizzes",
      rewardXp: DAILY_CHALLENGE_XP.Difícil,
    },
    {
      key: "checkin-3",
      title: "Fazer 3 check-ins de hábitos ou metas",
      description: "Reforce o compromisso com o que você quer construir.",
      difficulty: "Difícil",
      action: "habit_or_goal_checkin",
      href: "/planejar/metas",
      actionLabel: "Abrir metas e hábitos",
      target: 3,
      unit: "check-ins",
      rewardXp: DAILY_CHALLENGE_XP.Difícil,
    },
  ],
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Desloca uma data civil YYYY-MM-DD sem depender de UTC/local ou de horário de verão. */
export function shiftLocalDateKey(dateKey: string, offsetDays: number): string {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

function millisecondsUntilNextMidnight(date = new Date()): number {
  const nextMidnight = new Date(date);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - date.getTime());
}

export function formatDailyCountdown(date = new Date()): string {
  const totalSeconds = Math.floor(millisecondsUntilNextMidnight(date) / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function hashText(value: string): number {
  return [...value].reduce((hash, character) => ((hash * 31 + character.charCodeAt(0)) >>> 0), 7);
}

function selectDailyChallenge(difficulty: Exclude<DailyChallengeDifficulty, "Especial">, dateKey: string, slot: number) {
  const pool = DAILY_CHALLENGE_POOL[difficulty];
  return pool[(hashText(`${dateKey}:${difficulty}`) + slot) % pool.length]!;
}

function selectDistinctDailyChallenge(
  difficulty: Exclude<DailyChallengeDifficulty, "Especial">,
  dateKey: string,
  slot: number,
  usedActions: Set<GamificationAction>,
): DailyChallengeDefinition {
  const pool = DAILY_CHALLENGE_POOL[difficulty];
  const start = (hashText(`${dateKey}:${difficulty}`) + slot) % pool.length;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset) % pool.length]!;
    if (!usedActions.has(candidate.action)) return candidate;
  }
  return selectDailyChallenge(difficulty, dateKey, slot);
}

/** Rotação determinística por data: todos veem uma composição estável durante o dia. */
export function getDailyChallenges(dateKey = localDateKey()): DailyChallengeDefinition[] {
  const usedActions = new Set<GamificationAction>();
  const selected = [0, 1].map((slot) => {
    const challenge = selectDistinctDailyChallenge("Fácil", dateKey, slot, usedActions);
    usedActions.add(challenge.action);
    return challenge;
  });
  for (const [difficulty, slot] of [["Médio", 0], ["Difícil", 0]] as const) {
    const challenge = selectDistinctDailyChallenge(difficulty, dateKey, slot, usedActions);
    usedActions.add(challenge.action);
    selected.push(challenge);
  }
  return selected;
}

export interface DailyChallengeDaySummary {
  dateKey: string;
  completedCount: number;
  totalCount: number;
  rewardXp: number;
  completedTitles: string[];
}

/** Resume os desafios de dias anteriores usando o mesmo catálogo determinístico daquela data. */
export function summarizeDailyChallengeHistory(
  todayKey: string,
  progressRows: DailyChallengeProgress[],
  dayCount = 7,
): DailyChallengeDaySummary[] {
  const progressByDateAndKey = new Map(
    progressRows.map((row) => [`${row.challenge_date}:${row.challenge_key}`, row] as const),
  );

  return Array.from({ length: Math.max(0, Math.floor(dayCount)) }, (_, index) => {
    const dateKey = shiftLocalDateKey(todayKey, -(index + 1));
    const completedChallenges = getDailyChallenges(dateKey).filter((challenge) =>
      Boolean(progressByDateAndKey.get(`${dateKey}:${challenge.key}`)?.completed_at),
    );

    return {
      dateKey,
      completedCount: completedChallenges.length,
      totalCount: getDailyChallenges(dateKey).length,
      rewardXp: completedChallenges.reduce((total, challenge) => total + challenge.rewardXp, 0),
      completedTitles: completedChallenges.map((challenge) => challenge.title),
    };
  });
}
