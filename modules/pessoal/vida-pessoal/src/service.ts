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
    const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
    const normalizedMonth = String(month).padStart(2, "0");
    return {
      periodStart: `${year}-${normalizedMonth}-01`,
      periodEnd: `${year}-${normalizedMonth}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  if (planType === "anual") {
    return { periodStart: `${input.year}-01-01`, periodEnd: `${input.year}-12-31` };
  }
  return { periodStart: `${input.year}-01-01`, periodEnd: `${input.year! + 4}-12-31` };
}

/** Chave YYYY-MM-DD no fuso local; evita trocar de dia perto da meia-noite por causa de UTC. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return sessions.filter((s) => {
    const startedAt = new Date(s.started_at);
    return s.status === "completed" && startedAt >= weekStart && startedAt <= referenceDate;
  }).length;
}

export function completedPomodoroMinutesThisWeek(sessions: PomodoroSession[], referenceDate: Date): number {
  const weekStart = startOfLocalWeek(referenceDate);
  return sessions.reduce((total, session) => {
    const startedAt = new Date(session.started_at);
    if (session.status !== "completed" || startedAt < weekStart || startedAt > referenceDate) return total;
    return total + session.duration_minutes;
  }, 0);
}
