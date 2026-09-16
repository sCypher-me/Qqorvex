import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createAccount,
  createBudget,
  createCard,
  createCategory,
  createInstallmentPurchase,
  createRecurringTransaction,
  createTransaction,
  deleteTransaction,
  generateOccurrence,
  getOrCreateCurrentStatement,
  listAccounts,
  listBudgets,
  listCards,
  listCardStatements,
  listCategories,
  listInstallments,
  listRecurringTransactions,
  listTransactions,
  listTransactionsForCardInPeriod,
  markStatementPaid,
  updateCardClosingConfig,
  updateRecurringStatus,
  updateTransactionStatus,
} from "../repository";
import type {
  Account,
  Card,
  CategoryKind,
  NewTransactionInput,
  RecurrenceFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "../types";

const TRANSACTIONS_KEY = ["transactions"] as const;
const ACCOUNTS_KEY = ["accounts"] as const;
const CATEGORIES_KEY = ["categories"] as const;
const CARDS_KEY = ["cards"] as const;
const RECURRING_KEY = ["recurring-transactions"] as const;
const INSTALLMENTS_KEY = ["installments"] as const;
const BUDGETS_KEY = ["budgets"] as const;
const cardStatementsKey = (cardId: string) => ["card-statements", cardId] as const;
const cardPeriodTransactionsKey = (cardId: string, periodStartIso: string, periodEndIso: string) =>
  ["card-period-transactions", cardId, periodStartIso, periodEndIso] as const;

export function useTransactions(client: SupabaseClient<Database>, fromDate?: string, toDate?: string) {
  const query = useQuery({
    queryKey: [...TRANSACTIONS_KEY, fromDate, toDate],
    queryFn: () => listTransactions(client, fromDate, toDate),
  });
  return { transactions: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateTransaction(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTransactionInput) => createTransaction(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}

export function useUpdateTransactionStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Transaction["status"] }) =>
      updateTransactionStatus(client, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}

export function useDeleteTransaction(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(client, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}

export function useAccounts(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => listAccounts(client) });
  return { accounts: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateAccount(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, accountType }: { name: string; accountType?: Account["account_type"] }) =>
      createAccount(client, userId, name, accountType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useCategories(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: CATEGORIES_KEY, queryFn: () => listCategories(client) });
  return { categories: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateCategory(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, kind }: { name: string; kind: CategoryKind }) => createCategory(client, userId, name, kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useCards(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: CARDS_KEY, queryFn: () => listCards(client) });
  return { cards: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateCard(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nickname, closingDay, dueDay }: { nickname: string; closingDay?: number; dueDay?: number }) =>
      createCard(client, userId, nickname, { closingDay, dueDay }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CARDS_KEY }),
  });
}

export function useUpdateCardClosingConfig(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, closingDay, dueDay }: { cardId: string; closingDay: number; dueDay: number }) =>
      updateCardClosingConfig(client, cardId, { closingDay, dueDay }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CARDS_KEY }),
  });
}

export function useCardStatements(client: SupabaseClient<Database>, cardId: string) {
  const query = useQuery({ queryKey: cardStatementsKey(cardId), queryFn: () => listCardStatements(client, cardId) });
  return { statements: query.data ?? [], isLoading: query.isLoading };
}

export function useTransactionsForCardInPeriod(
  client: SupabaseClient<Database>,
  cardId: string,
  periodStartIso: string,
  periodEndIso: string,
  enabled = true,
) {
  const query = useQuery({
    queryKey: cardPeriodTransactionsKey(cardId, periodStartIso, periodEndIso),
    queryFn: () => listTransactionsForCardInPeriod(client, cardId, periodStartIso, periodEndIso),
    enabled,
  });
  return { transactions: query.data ?? [], isLoading: query.isLoading };
}

export function useEnsureCurrentStatement(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ card, referenceDate }: { card: Card; referenceDate: Date }) =>
      getOrCreateCurrentStatement(client, userId, card, referenceDate),
    onSuccess: (statement) => queryClient.invalidateQueries({ queryKey: cardStatementsKey(statement.card_id) }),
  });
}

export function useMarkStatementPaid(client: SupabaseClient<Database>, cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statementId: string) => markStatementPaid(client, statementId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardStatementsKey(cardId) }),
  });
}

export function useRecurringTransactions(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: RECURRING_KEY, queryFn: () => listRecurringTransactions(client) });
  return { recurringTransactions: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateRecurringTransaction(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      amount: number;
      transactionType: Exclude<TransactionType, "transferencia">;
      frequency: RecurrenceFrequency;
      startDate: string;
      isSubscription?: boolean;
    }) => createRecurringTransaction(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useUpdateRecurringStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecurringTransaction["status"] }) =>
      updateRecurringStatus(client, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useGenerateOccurrence(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurring: RecurringTransaction) => generateOccurrence(client, userId, recurring),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}

export function useInstallments(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: INSTALLMENTS_KEY, queryFn: () => listInstallments(client) });
  return { installments: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateInstallmentPurchase(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; totalAmount: number; installmentCount: number; firstInstallmentDate: string }) =>
      createInstallmentPurchase(client, userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTALLMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}

export function useBudgets(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: BUDGETS_KEY, queryFn: () => listBudgets(client) });
  return { budgets: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateBudget(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { categoryId: string; yearMonth: string; limitAmount: number }) => createBudget(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}
