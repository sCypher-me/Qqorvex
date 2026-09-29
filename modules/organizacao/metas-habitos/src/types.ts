import type { Tables, TablesInsert, TablesUpdate, Json } from "@qqorvex/database";

/**
 * Metas & Hábitos é a única fonte de verdade de metas, marcos, check-ins, hábitos, rotinas e
 * registros de hábito. v1 lean: sem Rotinas, Revisão Semanal, Insights e Notificações (todos
 * "recursos opcionais" no Xmind) — ficam para uma iteração futura sobre estas mesmas tabelas.
 */
export type Goal = Tables<"goals">;
export type GoalStatus = Goal["status"];
export type GoalProgressType = Goal["progress_type"];
export type GoalMilestone = Tables<"goal_milestones">;
export type GoalCheckin = Tables<"goal_checkins">;
export type Habit = Tables<"habits">;
export type HabitStatus = Habit["status"];
export type HabitFrequencyType = Habit["frequency_type"];
export type HabitLog = Tables<"habit_logs">;
export type HabitLogState = HabitLog["state"];
export type Routine = Tables<"routines">;

export interface NewGoalInput {
  title: string;
  description?: string;
  dueDate?: string;
  category?: string;
  motivationNote?: string;
  tags?: string[];
  parentGoalId?: string;
  status?: GoalStatus;
  progressType?: GoalProgressType;
  progressNumericTarget?: number;
  progressSourceAccountId?: string;
}

export function toGoalInsert(userId: string, input: NewGoalInput): TablesInsert<"goals"> {
  return {
    user_id: userId,
    title: input.title,
    status: input.status ?? "ativa",
    description: input.description ?? null,
    due_date: input.dueDate ?? null,
    category: input.category ?? null,
    motivation_note: input.motivationNote ?? null,
    tags: input.tags ?? [],
    parent_goal_id: input.parentGoalId ?? null,
    progress_type: input.progressType ?? "binario",
    progress_numeric_target: input.progressNumericTarget ?? null,
    progress_source_account_id: input.progressSourceAccountId ?? null,
  };
}

/** Campos que o usuário edita numa meta. Status e forma de progresso têm fluxos próprios. */
export type GoalEditInput = Pick<NewGoalInput, "title" | "description" | "dueDate" | "category" | "motivationNote">;

/** Opcional em branco vira `null`, para que editar consiga de fato limpar o campo. */
export function toGoalUpdate(input: GoalEditInput): TablesUpdate<"goals"> {
  return {
    title: input.title,
    description: input.description ?? null,
    due_date: input.dueDate ?? null,
    category: input.category ?? null,
    motivation_note: input.motivationNote ?? null,
  };
}

export interface HabitFrequencyConfig {
  days?: string[];
  timesPerWeek?: number;
}

export interface NewHabitInput {
  name: string;
  description?: string;
  frequencyType?: HabitFrequencyType;
  frequencyConfig?: HabitFrequencyConfig;
  preferredTime?: string;
  category?: string;
  tags?: string[];
}

export function toHabitInsert(userId: string, input: NewHabitInput): TablesInsert<"habits"> {
  return {
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    frequency_type: input.frequencyType ?? "diaria",
    frequency_config: (input.frequencyConfig ?? {}) as unknown as Json,
    preferred_time: input.preferredTime ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
  };
}

/** Campos que o usuário edita num hábito — os mesmos do formulário de criação. */
export type HabitEditInput = Omit<NewHabitInput, "tags">;

export function toHabitUpdate(input: HabitEditInput): TablesUpdate<"habits"> {
  return {
    name: input.name,
    description: input.description ?? null,
    frequency_type: input.frequencyType ?? "diaria",
    frequency_config: (input.frequencyConfig ?? {}) as unknown as Json,
    preferred_time: input.preferredTime ?? null,
    category: input.category ?? null,
  };
}
