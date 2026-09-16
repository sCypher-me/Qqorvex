import type { Tables } from "@qqorvex/database";

/**
 * Gamification Core (docs/decisions/gamification-core-design.md) é a fonte única de Nível/XP/
 * Badges/Título — Perfil (`/seguranca`) só referencia. Nível e Título nunca são guardados: são
 * sempre derivados de `xp` (mesmo padrão de "Metas — progresso derivado"), pra nunca divergir do
 * total real. `awardXp()` é chamado de dentro dos repositories de Tarefas, Metas & Hábitos,
 * Estudos e Biblioteca — não da página do app — pra premiar tanto ações feitas na UI quanto via
 * Vex (que chama os repositories diretamente).
 */
export type GamificationStats = Tables<"gamification_stats">;
export type UserBadge = Tables<"user_badges">;

export type GamificationAction = "task_completed" | "habit_or_goal_checkin" | "quiz_completed" | "library_item_completed";

export type GamificationCounterField =
  | "tasks_completed"
  | "habit_or_goal_checkins"
  | "quizzes_completed"
  | "library_items_completed";

export const GAMIFICATION_COUNTER_FIELD: Record<GamificationAction, GamificationCounterField> = {
  task_completed: "tasks_completed",
  habit_or_goal_checkin: "habit_or_goal_checkins",
  quiz_completed: "quizzes_completed",
  library_item_completed: "library_items_completed",
};
