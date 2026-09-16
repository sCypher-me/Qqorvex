import type { Goal, GoalMilestone, HabitLog } from "./types";

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

  let streak = 0;
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  while (doneDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
