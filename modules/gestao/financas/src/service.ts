import type { PaymentMethod, RecurrenceFrequency, Transaction, TransactionStatus } from "./types";

/** Rótulos em pt-BR do enum `payment_method` — fonte única pro formulário e pra listagem não divergirem. */
export const PAYMENT_METHOD_LABELS: Record<Exclude<PaymentMethod, null>, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  boleto: "Boleto",
  transferencia: "Transferência bancária",
  outra: "Outra",
};

/**
 * "Se a data informada for posterior ao dia de criação, a movimentação recebe estado Futura."
 * Puro, sem SQL — o chamador decide se aplica isso ou usa um status explícito do usuário.
 */
export function deriveInitialStatus(date: string, today: Date = new Date()): TransactionStatus {
  const todayStr = today.toISOString().slice(0, 10);
  return date > todayStr ? "futura" : "concluida";
}

export interface Balances {
  saldoAtual: number;
  saldoProjetado: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  entradasFuturas: number;
  saidasFuturas: number;
}

/**
 * "Saldo Atual considera apenas movimentações concluídas. Saldo Projetado soma entradas futuras
 * e subtrai saídas futuras previstas." Transferências nunca entram nesses totais — "não altera
 * Entradas/Saídas globais do patrimônio porque apenas move dinheiro entre contas do mesmo usuário."
 */
export function computeBalances(transactions: Transaction[]): Balances {
  let saldoAtual = 0;
  let entradasRealizadas = 0;
  let saidasRealizadas = 0;
  let entradasFuturas = 0;
  let saidasFuturas = 0;

  for (const t of transactions) {
    if (t.transaction_type === "transferencia" || t.status === "cancelada") continue;

    const isEntrada = t.transaction_type === "entrada";
    const isRealizada = t.status === "concluida";
    const isProjetavel = t.status === "futura" || t.status === "pendente" || t.status === "vencida";

    if (isRealizada) {
      saldoAtual += isEntrada ? t.amount : -t.amount;
      if (isEntrada) entradasRealizadas += t.amount;
      else saidasRealizadas += t.amount;
    } else if (isProjetavel) {
      if (isEntrada) entradasFuturas += t.amount;
      else saidasFuturas += t.amount;
    }
  }

  const saldoProjetado = saldoAtual + entradasFuturas - saidasFuturas;

  return { saldoAtual, saldoProjetado, entradasRealizadas, saidasRealizadas, entradasFuturas, saidasFuturas };
}

/**
 * Saldo atual de uma Conta específica — só transações `concluida` (mesmo critério de "saldo
 * atual" de `computeBalances`). Ao contrário de `computeBalances`, transferências contam aqui:
 * saem da conta de origem (`account_id`) e entram na conta de destino (`transfer_to_account_id`).
 * Usado por Metas & Hábitos pra progresso "derivado" (docs/decisions/metas-progresso-derivado-design.md).
 */
export function computeAccountBalance(transactions: Transaction[], accountId: string): number {
  let balance = 0;
  for (const t of transactions) {
    if (t.status !== "concluida") continue;

    if (t.transaction_type === "transferencia") {
      if (t.account_id === accountId) balance -= t.amount;
      if (t.transfer_to_account_id === accountId) balance += t.amount;
      continue;
    }

    if (t.account_id !== accountId) continue;
    balance += t.transaction_type === "entrada" ? t.amount : -t.amount;
  }
  return balance;
}

/**
 * Total gasto com um Veículo específico (Vida Pessoal) — só saídas `concluida` ligadas a
 * `vehicle_id`, mesmo critério de "realizado" usado em `computeBalances()`. Puro: quem chama
 * decide de onde vêm as transações (o módulo de Finanças não conhece Veículos, só o campo).
 */
export function computeVehicleSpending(transactions: Transaction[], vehicleId: string): number {
  return transactions
    .filter((t) => t.vehicle_id === vehicleId && t.transaction_type === "saida" && t.status === "concluida")
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * "A frequência determina automaticamente a próxima data." Ex.: Spotify anual com vencimento em
 * 09/10/2026 gera próxima cobrança em 09/10/2027.
 */
export function computeNextOccurrenceDate(currentDate: string, frequency: RecurrenceFrequency): string {
  const monthsByFrequency: Record<RecurrenceFrequency, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };
  const date = new Date(`${currentDate}T00:00:00`);
  date.setMonth(date.getMonth() + monthsByFrequency[frequency]);
  return date.toISOString().slice(0, 10);
}

/**
 * "Compra de R$ 3.600 em 12x gera 12 ocorrências de R$ 300." Divisão simples; a última parcela
 * absorve o resto de centavos para o total bater exatamente com `totalAmount`.
 */
export function computeInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
  const baseAmount = Math.floor((totalAmount / installmentCount) * 100) / 100;
  const amounts = new Array(installmentCount).fill(baseAmount);
  const roundedTotal = baseAmount * installmentCount;
  const remainder = Math.round((totalAmount - roundedTotal) * 100) / 100;
  amounts[amounts.length - 1] = Math.round((baseAmount + remainder) * 100) / 100;
  return amounts;
}

export function addMonthsToDate(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * "Fatura/fechamento de cartão" — a data de fechamento da fatura em aberto é a próxima ocorrência
 * do dia de fechamento a partir de hoje (hoje incluso). Ex.: fechamento dia 10, hoje 15/09 → a
 * fatura em aberto fecha em 10/10 (a de setembro já fechou).
 */
export function computeCurrentClosingDate(closingDay: number, referenceDate: Date): Date {
  const candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), closingDay);
  candidate.setHours(0, 0, 0, 0);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

/** Período da fatura: do dia seguinte ao fechamento anterior até a data de fechamento (inclusive). */
export function computeStatementPeriod(closingDay: number, referenceDate: Date): { periodStart: Date; periodEnd: Date } {
  const periodEnd = computeCurrentClosingDate(closingDay, referenceDate);
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  periodStart.setDate(periodStart.getDate() + 1);
  return { periodStart, periodEnd };
}

/** Vencimento é a próxima ocorrência do dia de vencimento estritamente após o fechamento. */
export function computeStatementDueDate(closingDate: Date, dueDay: number): Date {
  const due = new Date(closingDate.getFullYear(), closingDate.getMonth(), dueDay);
  due.setHours(0, 0, 0, 0);
  if (due <= closingDate) due.setMonth(due.getMonth() + 1);
  return due;
}

/** "Competência" da fatura: mês/ano da própria data de fechamento (`YYYY-MM`). */
export function toReferenceMonth(closingDate: Date): string {
  return `${closingDate.getFullYear()}-${String(closingDate.getMonth() + 1).padStart(2, "0")}`;
}

/** Total da fatura é sempre calculado a partir das transações do cartão no período — nunca duplicado. */
export function computeStatementTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * "Calendário Financeiro dedicado" — utilitários de grade de mês, próprios deste módulo (não
 * importados de `@qqorvex/module-agenda`: "módulos não acessam internals uns dos outros").
 */
export function startOfCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfCalendarWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
