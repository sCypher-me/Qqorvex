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
  updateTransaction,
  updateRecurringStatus,
  updateRecurringTransaction,
  updateTransactionStatus,
  createTransactionsBulk,
  updateAccount,
  deleteAccount,
  updateCategory,
  deleteCategory,
  deleteBudget,
  updateCard,
  deleteCard,
  deleteInvestmentPosition,
  fetchInvestmentQuotes,
  listInvestmentPositions,
  saveInvestmentPosition,
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
  UpdateTransactionInput,
  SaveInvestmentPositionInput,
} from "../types";
import type { RecurringTransactionEditInput } from "../service";

const TRANSACTIONS_KEY = ["transactions"] as const;
const ACCOUNTS_KEY = ["accounts"] as const;
const CATEGORIES_KEY = ["categories"] as const;
const CARDS_KEY = ["cards"] as const;
const RECURRING_KEY = ["recurring-transactions"] as const;
const INSTALLMENTS_KEY = ["installments"] as const;
const BUDGETS_KEY = ["budgets"] as const;
const investmentPositionsKey = (userId: string) => ["investment-positions", userId] as const;
const investmentQuotesKey = (userId: string) => ["investment-quotes", userId] as const;
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

export function useInvestmentPositions(client: SupabaseClient<Database>, userId: string) {
  const query = useQuery({ queryKey: investmentPositionsKey(userId), queryFn: () => listInvestmentPositions(client) });
  return { positions: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useInvestmentQuotes(client: SupabaseClient<Database>, userId: string, enabled = true) {
  const query = useQuery({
    queryKey: investmentQuotesKey(userId),
    queryFn: async () => {
      let result = await fetchInvestmentQuotes(client);
      const needsMarketRetry = !result.market || result.market.crypto.length === 0;
      // O endpoint mantém HTTP 200 para que as cotações da carteira continuem disponíveis
      // mesmo quando o feed público do mercado falha. Tenta recuperar uma vez antes de exibir
      // o estado parcial; isso evita depender de vários cliques manuais.
      if (needsMarketRetry) {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        result = await fetchInvestmentQuotes(client);
      }
      return result;
    },
    enabled,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
  });
  return {
    quotes: query.data?.quotes ?? [],
    market: query.data?.market ?? null,
    marketError: query.data?.marketError ?? (query.error instanceof Error ? query.error.message : null),
    apiKeyConfigured: query.data?.apiKeyConfigured ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

export function useSaveInvestmentPosition(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInvestmentPositionInput) => saveInvestmentPosition(client, userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investmentPositionsKey(userId) });
      void queryClient.invalidateQueries({ queryKey: investmentQuotesKey(userId) });
    },
  });
}

export function useDeleteInvestmentPosition(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvestmentPosition(client, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investmentPositionsKey(userId) });
      void queryClient.invalidateQueries({ queryKey: investmentQuotesKey(userId) });
    },
  });
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

export function useUpdateTransaction(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) => updateTransaction(client, id, input),
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
      categoryId?: string;
      accountId?: string;
      cardId?: string;
    }) => createRecurringTransaction(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useUpdateRecurringTransaction(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ current, input }: { current: RecurringTransaction; input: RecurringTransactionEditInput }) => updateRecurringTransaction(client, current, input),
    // Mesmo no erro "a série avançou", recarrega para mostrar a data atual.
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
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

/* ── Operações adicionadas no redesenho (edição/remoção e importação) ── */

function useFinanceMutation<TVariables>(fn: (variables: TVariables) => Promise<unknown>, keys: ReadonlyArray<readonly string[]>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useImportTransactions(client: SupabaseClient<Database>, userId: string) {
  return useFinanceMutation((inputs: NewTransactionInput[]) => createTransactionsBulk(client, userId, inputs), [TRANSACTIONS_KEY]);
}

export function useUpdateAccount(client: SupabaseClient<Database>) {
  return useFinanceMutation(({ id, name, accountType }: { id: string; name?: string; accountType?: Account["account_type"] }) => updateAccount(client, id, { name, accountType }), [ACCOUNTS_KEY]);
}

export function useDeleteAccount(client: SupabaseClient<Database>) {
  return useFinanceMutation((id: string) => deleteAccount(client, id), [ACCOUNTS_KEY, TRANSACTIONS_KEY]);
}

export function useUpdateCategory(client: SupabaseClient<Database>) {
  return useFinanceMutation(({ id, name }: { id: string; name: string }) => updateCategory(client, id, name), [CATEGORIES_KEY]);
}

export function useDeleteCategory(client: SupabaseClient<Database>) {
  return useFinanceMutation((id: string) => deleteCategory(client, id), [CATEGORIES_KEY, TRANSACTIONS_KEY, BUDGETS_KEY]);
}

export function useDeleteBudget(client: SupabaseClient<Database>) {
  return useFinanceMutation((id: string) => deleteBudget(client, id), [BUDGETS_KEY]);
}

export function useUpdateCard(client: SupabaseClient<Database>) {
  return useFinanceMutation(({ id, ...input }: { id: string; nickname?: string; institution?: string | null; lastDigits?: string | null }) => updateCard(client, id, input), [CARDS_KEY]);
}

export function useDeleteCard(client: SupabaseClient<Database>) {
  return useFinanceMutation((id: string) => deleteCard(client, id), [CARDS_KEY, TRANSACTIONS_KEY]);
}
