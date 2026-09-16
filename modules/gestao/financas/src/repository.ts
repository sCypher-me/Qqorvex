import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addMonthsToDate,
  computeCurrentClosingDate,
  computeInstallmentAmounts,
  computeNextOccurrenceDate,
  computeStatementDueDate,
  deriveInitialStatus,
  toReferenceMonth,
} from "./service";
import type {
  Account,
  Budget,
  Card,
  CardStatement,
  Category,
  CategoryKind,
  Installment,
  NewTransactionInput,
  RecurrenceFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "./types";
import { toTransactionInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listTransactions(client: Client, fromDate?: string, toDate?: string): Promise<Transaction[]> {
  let query = client.from("transactions").select("*").order("date", { ascending: false });
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTransaction(client: Client, userId: string, input: NewTransactionInput): Promise<Transaction> {
  const status = input.status ?? deriveInitialStatus(input.date);
  const { data, error } = await client
    .from("transactions")
    .insert(toTransactionInsert(userId, { ...input, status }))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransactionStatus(client: Client, id: string, status: Transaction["status"]): Promise<Transaction> {
  const { data, error } = await client.from("transactions").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(client: Client, id: string): Promise<void> {
  const { error } = await client.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function listAccounts(client: Client): Promise<Account[]> {
  const { data, error } = await client.from("accounts").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createAccount(
  client: Client,
  userId: string,
  name: string,
  accountType: Account["account_type"] = "outro",
): Promise<Account> {
  const { data, error } = await client
    .from("accounts")
    .insert({ user_id: userId, name, account_type: accountType })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories(client: Client): Promise<Category[]> {
  const { data, error } = await client.from("categories").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategory(client: Client, userId: string, name: string, kind: CategoryKind): Promise<Category> {
  const { data, error } = await client.from("categories").insert({ user_id: userId, name, kind }).select("*").single();
  if (error) throw error;
  return data;
}

export async function listCards(client: Client): Promise<Card[]> {
  const { data, error } = await client.from("cards").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCard(
  client: Client,
  userId: string,
  nickname: string,
  input?: { closingDay?: number; dueDay?: number },
): Promise<Card> {
  const { data, error } = await client
    .from("cards")
    .insert({ user_id: userId, nickname, closing_day: input?.closingDay ?? null, due_day: input?.dueDay ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listRecurringTransactions(client: Client): Promise<RecurringTransaction[]> {
  const { data, error } = await client
    .from("recurring_transactions")
    .select("*")
    .order("next_occurrence_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createRecurringTransaction(
  client: Client,
  userId: string,
  input: {
    name: string;
    amount: number;
    transactionType: Exclude<TransactionType, "transferencia">;
    frequency: RecurrenceFrequency;
    startDate: string;
    isSubscription?: boolean;
  },
): Promise<RecurringTransaction> {
  const { data, error } = await client
    .from("recurring_transactions")
    .insert({
      user_id: userId,
      name: input.name,
      amount: input.amount,
      transaction_type: input.transactionType,
      frequency: input.frequency,
      start_date: input.startDate,
      next_occurrence_date: input.startDate,
      is_subscription: input.isSubscription ?? false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringStatus(
  client: Client,
  id: string,
  status: RecurringTransaction["status"],
): Promise<RecurringTransaction> {
  const { data, error } = await client
    .from("recurring_transactions")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * "Cada cobrança é uma movimentação vinculada à recorrência." Cria a ocorrência como transação
 * e avança `next_occurrence_date` de acordo com a frequência — a recorrência nunca é, em si,
 * uma movimentação.
 */
export async function generateOccurrence(client: Client, userId: string, recurring: RecurringTransaction): Promise<Transaction> {
  const { data: transaction, error: transactionError } = await client
    .from("transactions")
    .insert({
      user_id: userId,
      name: recurring.name,
      amount: recurring.amount,
      transaction_type: recurring.transaction_type,
      date: recurring.next_occurrence_date,
      status: deriveInitialStatus(recurring.next_occurrence_date),
      category_id: recurring.category_id,
      account_id: recurring.account_id,
      card_id: recurring.card_id,
      payment_method: recurring.payment_method,
      recurring_transaction_id: recurring.id,
    })
    .select("*")
    .single();
  if (transactionError) throw transactionError;

  const { error: updateError } = await client
    .from("recurring_transactions")
    .update({ next_occurrence_date: computeNextOccurrenceDate(recurring.next_occurrence_date, recurring.frequency) })
    .eq("id", recurring.id);
  if (updateError) throw updateError;

  return transaction;
}

export async function listInstallments(client: Client): Promise<Installment[]> {
  const { data, error } = await client.from("installments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * "Compra de R$ 3.600 em 12x gera 12 ocorrências de R$ 300 vinculadas à mesma compra." Cria o
 * registro de parcelamento e as N transações de uma vez — cada parcela futura já entra na
 * projeção do período correspondente.
 */
export async function createInstallmentPurchase(
  client: Client,
  userId: string,
  input: { name: string; totalAmount: number; installmentCount: number; firstInstallmentDate: string },
): Promise<{ installment: Installment; transactions: Transaction[] }> {
  const { data: installment, error: installmentError } = await client
    .from("installments")
    .insert({
      user_id: userId,
      name: input.name,
      total_amount: input.totalAmount,
      installment_count: input.installmentCount,
      first_installment_date: input.firstInstallmentDate,
    })
    .select("*")
    .single();
  if (installmentError) throw installmentError;

  const amounts = computeInstallmentAmounts(input.totalAmount, input.installmentCount);
  const rows = amounts.map((amount, index) => ({
    user_id: userId,
    name: `${input.name} (${index + 1}/${input.installmentCount})`,
    amount,
    transaction_type: "saida" as const,
    date: addMonthsToDate(input.firstInstallmentDate, index),
    status: deriveInitialStatus(addMonthsToDate(input.firstInstallmentDate, index)),
    installment_id: installment.id,
    installment_number: index + 1,
  }));

  const { data: transactions, error: transactionsError } = await client.from("transactions").insert(rows).select("*");
  if (transactionsError) throw transactionsError;

  return { installment, transactions };
}

export async function listBudgets(client: Client): Promise<Budget[]> {
  const { data, error } = await client.from("budgets").select("*");
  if (error) throw error;
  return data;
}

export async function createBudget(
  client: Client,
  userId: string,
  input: { categoryId: string; yearMonth: string; limitAmount: number },
): Promise<Budget> {
  const { data, error } = await client
    .from("budgets")
    .insert({ user_id: userId, category_id: input.categoryId, year_month: input.yearMonth, limit_amount: input.limitAmount })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCardClosingConfig(
  client: Client,
  cardId: string,
  input: { closingDay: number; dueDay: number },
): Promise<Card> {
  const { data, error } = await client
    .from("cards")
    .update({ closing_day: input.closingDay, due_day: input.dueDay })
    .eq("id", cardId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listTransactionsForCardInPeriod(
  client: Client,
  cardId: string,
  periodStartIso: string,
  periodEndIso: string,
): Promise<Transaction[]> {
  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("card_id", cardId)
    .gte("date", periodStartIso)
    .lte("date", periodEndIso);
  if (error) throw error;
  return data;
}

export async function listCardStatements(client: Client, cardId: string): Promise<CardStatement[]> {
  const { data, error } = await client
    .from("card_statements")
    .select("*")
    .eq("card_id", cardId)
    .order("reference_month", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Garante a fatura em aberto do cartão (idempotente por `card_id`+`reference_month`, mesmo padrão
 * de `createEventForAssessment`): se já existe, retorna ela; senão cria com fechamento/vencimento
 * calculados a partir de `closing_day`/`due_day` do cartão.
 */
export async function getOrCreateCurrentStatement(client: Client, userId: string, card: Card, referenceDate: Date): Promise<CardStatement> {
  if (card.closing_day === null || card.due_day === null) {
    throw new Error("Este cartão ainda não tem dia de fechamento/vencimento configurado.");
  }

  const closingDate = computeCurrentClosingDate(card.closing_day, referenceDate);
  const referenceMonth = toReferenceMonth(closingDate);

  const { data: existing, error: existingError } = await client
    .from("card_statements")
    .select("*")
    .eq("card_id", card.id)
    .eq("reference_month", referenceMonth)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const dueDate = computeStatementDueDate(closingDate, card.due_day);
  const { data, error } = await client
    .from("card_statements")
    .insert({
      user_id: userId,
      card_id: card.id,
      reference_month: referenceMonth,
      closing_date: closingDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function markStatementPaid(client: Client, statementId: string): Promise<CardStatement> {
  const { data, error } = await client
    .from("card_statements")
    .update({ status: "paga", paid_at: new Date().toISOString() })
    .eq("id", statementId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
