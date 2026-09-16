import type { PlanType, PomodoroSession } from "./types";

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * O rótulo exibido de um Plano nunca é persistido — é sempre calculado a partir de
 * `plan_type`/`period_start`/`period_end`, a mesma fonte de verdade única usada no resto do
 * projeto (Saldo Atual/Projetado, total da fatura, etc.).
 */
export function computePlanLabel(plan: { plan_type: PlanType; period_start: string; period_end: string }): string {
  const start = new Date(`${plan.period_start}T00:00:00`);
  const endYear = new Date(`${plan.period_end}T00:00:00`).getFullYear();

  if (plan.plan_type === "mensal") return `${MONTH_NAMES_PT[start.getMonth()]} ${start.getFullYear()}`;
  if (plan.plan_type === "anual") return `${start.getFullYear()}`;
  return `${start.getFullYear()}–${endYear}`;
}

/**
 * A pessoa só escolhe um mês ou um ano, nunca duas datas soltas — o intervalo completo
 * (`period_start`/`period_end`) é derivado daqui, mesmo espírito de `computeWarrantyEndDate`.
 */
export function computePlanPeriod(
  planType: PlanType,
  input: { month?: string; year?: number },
): { periodStart: string; periodEnd: string } {
  if (planType === "mensal") {
    const [year, month] = input.month!.split("-").map(Number);
    const start = new Date(year!, month! - 1, 1);
    const end = new Date(year!, month!, 0);
    return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
  }
  if (planType === "anual") {
    return { periodStart: `${input.year}-01-01`, periodEnd: `${input.year}-12-31` };
  }
  return { periodStart: `${input.year}-01-01`, periodEnd: `${input.year! + 4}-12-31` };
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfLocalWeek(reference: Date): Date {
  const start = new Date(reference);
  start.setDate(reference.getDate() - reference.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Estatística nunca persistida — sempre somada a partir das linhas de `pomodoro_sessions`, mesmo
 * padrão de `computeBalances()`/`computeStatementTotal()` em Finanças. Só sessões `completed`
 * contam (mecânica do Forest: cancelar/sair antes do tempo "mata a árvore").
 */
export function countCompletedPomodorosToday(sessions: PomodoroSession[], referenceDate: Date): number {
  return sessions.filter((s) => s.status === "completed" && isSameLocalDay(new Date(s.started_at), referenceDate)).length;
}

export function countCompletedPomodorosThisWeek(sessions: PomodoroSession[], referenceDate: Date): number {
  const weekStart = startOfLocalWeek(referenceDate);
  return sessions.filter((s) => s.status === "completed" && new Date(s.started_at) >= weekStart).length;
}
