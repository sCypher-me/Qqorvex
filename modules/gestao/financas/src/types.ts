import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Finanças é a fonte de verdade dos dados financeiros; Hoje, Agenda, Vex e outros módulos
 * apenas consomem representações controladas. Saldo Atual/Projetado e o total da fatura de
 * cartão são calculados em service.ts, nunca em SQL.
 */
export type Account = Tables<"accounts">;
export type Card = Tables<"cards">;
export type Category = Tables<"categories">;
export type CategoryKind = Category["kind"];
export type RecurringTransaction = Tables<"recurring_transactions">;
export type RecurrenceFrequency = RecurringTransaction["frequency"];
export type Installment = Tables<"installments">;
export type Transaction = Tables<"transactions">;
export type TransactionType = Transaction["transaction_type"];
export type TransactionStatus = Transaction["status"];
export type PaymentMethod = Transaction["payment_method"];
export type Budget = Tables<"budgets">;
export type CardStatement = Tables<"card_statements">;
export type CardStatementStatus = CardStatement["status"];

export interface NewTransactionInput {
  name: string;
  amount: number;
  transactionType: TransactionType;
  date: string;
  categoryId?: string;
  accountId?: string;
  transferToAccountId?: string;
  cardId?: string;
  vehicleId?: string;
  paymentMethod?: PaymentMethod;
  status?: TransactionStatus;
  tags?: string[];
}

export function toTransactionInsert(userId: string, input: NewTransactionInput): TablesInsert<"transactions"> {
  return {
    user_id: userId,
    name: input.name,
    amount: input.amount,
    transaction_type: input.transactionType,
    date: input.date,
    category_id: input.categoryId ?? null,
    account_id: input.accountId ?? null,
    transfer_to_account_id: input.transferToAccountId ?? null,
    card_id: input.cardId ?? null,
    vehicle_id: input.vehicleId ?? null,
    payment_method: input.paymentMethod ?? null,
    status: input.status ?? "concluida",
    tags: input.tags ?? [],
  };
}
