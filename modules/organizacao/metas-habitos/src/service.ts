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

export type HabitStreakUnit = "dia" | "vez" | "semana" | "mes";

export interface HabitStreak {
  count: number;
  unit: HabitStreakUnit;
}

/**
 * Sequência medida na frequência do próprio hábito — `computeCurrentStreak` conta dias corridos e
 * zerava, por exemplo, um hábito de seg/qua/sex toda terça. Regras:
 * - diário: dias seguidos (mesma regra de `computeCurrentStreak`);
 * - dias específicos: vezes seguidas; dia fora da agenda nunca quebra, dia previsto sem registro
 *   quebra (menos hoje, que ainda está em aberto);
 * - X vezes por semana / semanal: semanas (domingo a sábado) que bateram a cota;
 * - mensal: meses com pelo menos um registro.
 * O período atual só soma quando a cota já foi batida e nunca quebra a sequência.
 */
export function computeHabitStreak(habit: Habit, logs: HabitLog[], referenceDate: Date): HabitStreak {
  const unit = habitStreakUnit(habit);
  const doneDates = new Set(logs.filter((log) => log.state === "concluido").map((log) => log.log_date));
  if (doneDates.size === 0) return { count: 0, unit };

  const today = localDateKey(referenceDate);
  const earliest = [...doneDates].sort()[0] ?? today;

  switch (unit) {
    case "vez": {
      const days = ((habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig).days ?? [];
      return { count: countScheduledStreak(doneDates, today, earliest, days), unit };
    }
    case "semana":
      return { count: countPeriodStreak(doneDates, today, earliest, "semana", getHabitWeeklyTarget(habit) ?? 1), unit };
    case "mes":
      return { count: countPeriodStreak(doneDates, today, earliest, "mes", 1), unit };
    default:
      return { count: computeCurrentStreak(logs, referenceDate), unit };
  }
}

/** "3 dias seguidos", "1 vez seguida", "2 semanas seguidas", "1 mês seguido". */
export function formatHabitStreak({ count, unit }: HabitStreak): string {
  const one = count === 1;
  const label = {
    dia: one ? "dia seguido" : "dias seguidos",
    vez: one ? "vez seguida" : "vezes seguidas",
    semana: one ? "semana seguida" : "semanas seguidas",
    mes: one ? "mês seguido" : "meses seguidos",
  }[unit];
  return `${count} ${label}`;
}

/** Duração aproximada em dias, só para comparar sequências de unidades diferentes. */
export function habitStreakDays({ count, unit }: HabitStreak): number {
  return count * { dia: 1, vez: 1, semana: 7, mes: 30 }[unit];
}

function habitStreakUnit(habit: Habit): HabitStreakUnit {
  switch (habit.frequency_type) {
    case "dias_especificos":
      return (((habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig).days?.length ?? 0) > 0 ? "vez" : "dia";
    case "x_vezes_semana":
    case "semanal":
      return "semana";
    case "mensal":
      return "mes";
    default:
      return "dia";
  }
}

function countScheduledStreak(doneDates: Set<string>, today: string, earliest: string, days: string[]): number {
  let count = 0;
  for (let cursor = today; cursor >= earliest; cursor = shiftDateKey(cursor, -1)) {
    if (doneDates.has(cursor)) {
      count += 1;
      continue;
    }
    if (cursor !== today && isScheduledWeekday(days, weekdayOfKey(cursor))) break;
  }
  return count;
}

function countPeriodStreak(doneDates: Set<string>, today: string, earliest: string, period: "semana" | "mes", target: number): number {
  const currentStart = periodStartOf(today, period);
  let count = 0;
  for (let start = currentStart; ; start = previousPeriodStart(start, period)) {
    const end = nextPeriodStart(start, period);
    let done = 0;
    for (const date of doneDates) if (date >= start && date < end) done += 1;
    if (done >= target) count += 1;
    else if (start !== currentStart) break;
    if (start <= earliest) break;
  }
  return count;
}

function weekdayOfKey(dateKey: string): number {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isScheduledWeekday(days: string[], weekday: number): boolean {
  const code = WEEKDAY_CODES[weekday];
  const legacy = LEGACY_WEEKDAY_CODES[weekday];
  return days.some((day) => day === code || day === legacy);
}

function periodStartOf(dateKey: string, period: "semana" | "mes"): string {
  return period === "semana" ? shiftDateKey(dateKey, -weekdayOfKey(dateKey)) : `${dateKey.slice(0, 8)}01`;
}

function nextPeriodStart(start: string, period: "semana" | "mes"): string {
  if (period === "semana") return shiftDateKey(start, 7);
  const [year = 1970, month = 1] = start.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function previousPeriodStart(start: string, period: "semana" | "mes"): string {
  if (period === "semana") return shiftDateKey(start, -7);
  const [year = 1970, month = 1] = start.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
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
