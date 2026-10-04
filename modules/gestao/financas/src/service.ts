import type { PaymentMethod, RecurrenceFrequency, RecurringTransaction, Transaction, TransactionStatus } from "./types";

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

/** Formata uma data civil no fuso local, sem deslocar o dia por conversão UTC. */
export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface RecurringTransactionEditInput {
  name: string;
  amount: number;
  transactionType: "entrada" | "saida";
  frequency: RecurrenceFrequency;
  nextOccurrenceDate: string;
  isSubscription: boolean;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
}

/**
 * Edição de uma recorrência: vale da próxima cobrança em diante (lançamentos já criados não
 * mudam). Mudar a próxima data move também `start_date`, âncora do dia do mês. Regras:
 * - data nova no passado é recusada (a geração criaria vários lançamentos de uma vez) e não pode
 *   passar do término da série;
 * - cartão grava o método "crédito"; sair do cartão limpa esse método, mas um método diferente
 *   que já existia é preservado;
 * - receita nunca é assinatura nem vai para cartão;
 * - observação e término não estão no formulário e ficam como estão.
 */
export function toRecurringTransactionUpdate(
  current: Pick<RecurringTransaction, "next_occurrence_date" | "payment_method" | "end_date">,
  input: RecurringTransactionEditInput,
  today = formatLocalDate(new Date()),
): Partial<RecurringTransaction> {
  if (!(input.amount > 0)) throw new Error("Informe um valor maior que zero.");
  const dateChanged = input.nextOccurrenceDate !== current.next_occurrence_date;
  if (dateChanged && input.nextOccurrenceDate < today) throw new Error("A próxima data não pode ficar no passado.");
  if (current.end_date && input.nextOccurrenceDate > current.end_date) throw new Error("A próxima data passa do término desta recorrência.");

  const isIncome = input.transactionType === "entrada";
  const cardId = isIncome ? null : input.cardId ?? null;
  const paymentMethod: Partial<RecurringTransaction> = cardId
    ? { payment_method: "credito" }
    : current.payment_method === "credito"
      ? { payment_method: null }
      : {};

  return {
    name: input.name,
    amount: input.amount,
    transaction_type: input.transactionType,
    frequency: input.frequency,
    next_occurrence_date: input.nextOccurrenceDate,
    is_subscription: isIncome ? false : input.isSubscription,
    category_id: input.categoryId ?? null,
    account_id: cardId ? null : input.accountId ?? null,
    card_id: cardId,
    ...paymentMethod,
    ...(dateChanged ? { start_date: input.nextOccurrenceDate } : {}),
  };
}

/** Converte formatos comuns do campo monetário pt-BR, como "1.234,56" e "1234.56". */
export function parseBRLInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : Number.NaN;
}

function dateParts(isoDate: string): { year: number; month: number; day: number } {
  const parts = isoDate.split("-");
  const year = Number(parts[0] ?? NaN);
  const month = Number(parts[1] ?? NaN);
  const day = Number(parts[2] ?? NaN);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Data inválida.");
  }
  return { year, month, day };
}

/** Soma meses preservando o dia quando possível e limitando ao último dia do mês-alvo. */
export function addMonthsToDate(date: string, months: number): string {
  const { year, month, day } = dateParts(date);
  const targetMonthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return formatLocalDate(new Date(targetYear, targetMonth, Math.min(day, lastDay)));
}

/**
 * "Se a data informada for posterior ao dia de criação, a movimentação recebe estado Futura."
 * Puro, sem SQL — o chamador decide se aplica isso ou usa um status explícito do usuário.
 */
export function deriveInitialStatus(date: string, today: Date = new Date()): TransactionStatus {
  const todayStr = formatLocalDate(today);
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
 * Usado por Metas & Hábitos pra progresso "derivado".
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
export function computeNextOccurrenceDate(currentDate: string, frequency: RecurrenceFrequency, anchorDate = currentDate): string {
  const monthsByFrequency: Record<RecurrenceFrequency, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };
  const nextMonth = addMonthsToDate(currentDate, monthsByFrequency[frequency]);
  const { day: anchorDay } = dateParts(anchorDate);
  const { year, month } = dateParts(nextMonth);
  const targetMonth = month - 1;
  return formatLocalDate(new Date(year, targetMonth, Math.min(anchorDay, new Date(year, month, 0).getDate())));
}

/**
 * "Compra de R$ 3.600 em 12x gera 12 ocorrências de R$ 300." Divisão simples; a última parcela
 * absorve o resto de centavos para o total bater exatamente com `totalAmount`.
 */
export function computeInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
  if (!Number.isInteger(installmentCount) || installmentCount < 2 || installmentCount > 120) {
    throw new Error("O parcelamento deve ter entre 2 e 120 parcelas.");
  }
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("O valor total precisa ser maior que zero.");
  }
  const roundedTotal = Math.round((totalAmount + Number.EPSILON) * 100) / 100;
  const baseAmount = Math.floor((roundedTotal / installmentCount) * 100) / 100;
  const amounts = new Array(installmentCount).fill(baseAmount);
  const baseTotal = baseAmount * installmentCount;
  const remainder = Math.round((roundedTotal - baseTotal) * 100) / 100;
  amounts[amounts.length - 1] = Math.round((baseAmount + remainder) * 100) / 100;
  return amounts;
}

export interface BudgetUsage {
  realized: number;
  committed: number;
}

export interface ProjectedRecurringOccurrence {
  recurringId: string;
  name: string;
  amount: number;
  date: string;
  transaction_type: RecurringTransaction["transaction_type"];
  category_id: string | null;
}

/** Projeta cobranças no intervalo solicitado sem gravar transações no banco. */
export function projectRecurringOccurrences(
  recurringTransactions: RecurringTransaction[],
  fromDate: string,
  toDate: string,
): ProjectedRecurringOccurrence[] {
  if (toDate < fromDate) return [];
  const projected: ProjectedRecurringOccurrence[] = [];

  for (const recurring of recurringTransactions) {
    if (recurring.status !== "ativa") continue;
    let date = recurring.next_occurrence_date;
    let guard = 0;
    while (date <= toDate && guard < 2400) {
      if (date >= fromDate && (!recurring.end_date || date <= recurring.end_date)) {
        projected.push({
          recurringId: recurring.id,
          name: recurring.name,
          amount: recurring.amount,
          date,
          transaction_type: recurring.transaction_type,
          category_id: recurring.category_id,
        });
      }
      if (recurring.end_date && date >= recurring.end_date) break;
      const nextDate = computeNextOccurrenceDate(date, recurring.frequency, recurring.start_date);
      if (nextDate <= date) break;
      date = nextDate;
      guard += 1;
    }
  }

  return projected.sort((a, b) => a.date.localeCompare(b.date));
}

/** Separa o que já aconteceu dos compromissos previstos no limite mensal da categoria. */
export function computeBudgetUsage(
  transactions: Transaction[],
  categoryId: string,
  yearMonth: string,
  recurringTransactions: RecurringTransaction[] = [],
): BudgetUsage {
  let realized = 0;
  let committed = 0;

  for (const transaction of transactions) {
    if (
      transaction.transaction_type !== "saida" ||
      transaction.category_id !== categoryId ||
      !transaction.date.startsWith(yearMonth)
    ) continue;

    if (transaction.status === "concluida") realized += transaction.amount;
    else if (transaction.status === "futura" || transaction.status === "pendente" || transaction.status === "vencida") {
      committed += transaction.amount;
    }
  }

  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  const monthStart = `${yearMonth}-01`;
  const monthEnd = formatLocalDate(new Date(year, month, 0));
  const representedOccurrences = new Set(
    transactions
      .filter((transaction) => transaction.recurring_transaction_id)
      .map((transaction) => `${transaction.recurring_transaction_id}:${transaction.date}`),
  );
  for (const occurrence of projectRecurringOccurrences(recurringTransactions, monthStart, monthEnd)) {
    if (
      occurrence.transaction_type !== "saida" ||
      occurrence.category_id !== categoryId ||
      representedOccurrences.has(`${occurrence.recurringId}:${occurrence.date}`)
    ) continue;
    committed += occurrence.amount;
  }

  return { realized, committed };
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
