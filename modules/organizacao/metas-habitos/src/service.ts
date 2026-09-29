import type { Goal, GoalMilestone, HabitLog } from "./types";
import type { Habit, HabitFrequencyConfig } from "./types";

/**
 * "Suportar inicialmente no máximo: Meta principal, Submetas de primeiro nível." Uma submeta não
 * pode, por sua vez, ter uma submeta (profundidade máxima 2).
 */
export function canBeSubGoal(candidateParent: Goal | undefined): boolean {
  if (!candidateParent) return false;
  return candidateParent.parent_goal_id === null;
}

/**
 * "Por marcos: progresso baseado em marcos concluídos." Só se aplica quando progress_type
 * da meta for 'marcos'; retorna null sem marcos (não inventar progresso).
 */
export function computeMilestoneProgress(milestones: GoalMilestone[]): number | null {
  if (milestones.length === 0) return null;
  const done = milestones.filter((m) => m.is_done).length;
  return Math.round((done / milestones.length) * 100);
}

/**
 * "Sequência atual" — dias consecutivos com registro 'concluido' terminando na data de
 * referência (ou no dia mais recente com registro, o que vier primeiro). Informativo, não é
 * score de disciplina: a UI decide como apresentar o número, sem linguagem de culpa.
 */
export function computeCurrentStreak(logs: HabitLog[], referenceDate: Date): number {
  const doneDates = new Set(
    logs.filter((log) => log.state === "concluido").map((log) => log.log_date),
  );

  const today = localDateKey(referenceDate);
  // A sequência de ontem continua válida durante o dia de hoje, até o usuário registrar
  // o hábito. Isso evita mostrar "0 dias" logo pela manhã para quem cumpriu ontem.
  let cursorDate = doneDates.has(today) ? today : shiftDateKey(today, -1);
  if (!doneDates.has(cursorDate)) return 0;

  let streak = 0;
  while (doneDates.has(cursorDate)) {
    streak += 1;
    cursorDate = shiftDateKey(cursorDate, -1);
  }

  return streak;
}

/** Data civil local em YYYY-MM-DD, sem deslocar o dia por conversão para UTC. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Desloca uma data YYYY-MM-DD em dias usando UTC apenas para aritmética de calendário. */
export function shiftDateKey(dateKey: string, amount: number): string {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

/** Alvo de frequência semanal para que o resumo da semana não trate todo hábito como diário. */
export function getHabitWeeklyTarget(habit: Habit): number | null {
  switch (habit.frequency_type) {
    case "diaria":
      return 7;
    case "dias_especificos":
      return Math.min(7, ((habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig).days?.length ?? 0);
    case "x_vezes_semana":
      return Math.min(7, Math.max(1, ((habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig).timesPerWeek ?? 1));
    case "semanal":
      return 1;
    case "mensal":
      return null;
    default:
      return null;
  }
}

/**
 * "Derivado: progresso baseado em dado de outro módulo" — hoje só Finanças (saldo de Conta vs.
 * `progress_numeric_target`). Puro: quem chama já calculou o saldo atual via
 * `computeAccountBalance` de `@qqorvex/module-financas` (docs/decisions/
 * metas-progresso-derivado-design.md). Alvo zero/negativo não tem "percentual" sensato — 0%.
 */
export function computeDerivedProgress(currentBalance: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentBalance / targetAmount) * 100)));
}

const WEEKDAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const LEGACY_WEEKDAY_CODES = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

/**
 * Como o hábito se encaixa num dia: "fixo" (diário ou dia da semana marcado), "flexível" (cota
 * semanal/mensal — pode ser feito em qualquer dia) ou `null` (não se aplica / inativo).
 */
export function habitScheduleOn(habit: Habit, date: Date): "fixo" | "flexivel" | null {
  if (habit.status !== "ativo") return null;
  if (habit.frequency_type === "diaria") return "fixo";
  if (habit.frequency_type === "dias_especificos") {
    const config = (habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig;
    const code = WEEKDAY_CODES[date.getDay()] ?? "sun";
    const legacy = LEGACY_WEEKDAY_CODES[date.getDay()] ?? "dom";
    return (config.days ?? []).some((day) => day === code || day === legacy) ? "fixo" : null;
  }
  return "flexivel";
}
