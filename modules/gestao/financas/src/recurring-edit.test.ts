import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { updateRecurringTransaction } from "./repository";
import { toRecurringTransactionUpdate } from "./service";
import type { RecurringTransaction } from "./types";

const series = { id: "r1", next_occurrence_date: "2026-10-10", start_date: "2026-01-10", payment_method: null, end_date: null } as RecurringTransaction;
const today = "2026-09-29";
const base = { name: "Internet", amount: 120, transactionType: "saida" as const, frequency: "mensal" as const, nextOccurrenceDate: "2026-10-10", isSubscription: false };

describe("toRecurringTransactionUpdate", () => {
  it("edita os campos do formulário sem mexer na âncora se a data não mudou", () => {
    expect(toRecurringTransactionUpdate(series, { ...base, categoryId: "cat-1", accountId: "acc-1" }, today)).toEqual({
      name: "Internet",
      amount: 120,
      transaction_type: "saida",
      frequency: "mensal",
      next_occurrence_date: "2026-10-10",
      is_subscription: false,
      category_id: "cat-1",
      account_id: "acc-1",
      card_id: null,
    });
  });

  it("mudar a próxima data move a âncora do dia do mês junto", () => {
    expect(toRecurringTransactionUpdate(series, { ...base, nextOccurrenceDate: "2026-10-05" }, today)).toMatchObject({ next_occurrence_date: "2026-10-05", start_date: "2026-10-05" });
  });

  it("recusa data no passado e valor zerado", () => {
    expect(() => toRecurringTransactionUpdate(series, { ...base, nextOccurrenceDate: "2026-09-01" }, today)).toThrow(/passado/);
    expect(() => toRecurringTransactionUpdate(series, { ...base, amount: 0 }, today)).toThrow(/valor/i);
  });

  it("recusa próxima data depois do término da série", () => {
    const ending = { ...series, end_date: "2026-12-31" } as RecurringTransaction;
    expect(() => toRecurringTransactionUpdate(ending, { ...base, nextOccurrenceDate: "2027-01-10" }, today)).toThrow(/término/);
  });

  it("cartão grava 'crédito'; trocar de cartão para conta limpa esse método", () => {
    expect(toRecurringTransactionUpdate(series, { ...base, cardId: "card-1" }, today)).toMatchObject({ card_id: "card-1", account_id: null, payment_method: "credito" });
    const onCard = { ...series, payment_method: "credito" } as RecurringTransaction;
    expect(toRecurringTransactionUpdate(onCard, { ...base, accountId: "acc-1" }, today)).toMatchObject({ card_id: null, payment_method: null });
  });

  it("preserva outro método de pagamento que já existia", () => {
    const pix = { ...series, payment_method: "pix" } as RecurringTransaction;
    expect(toRecurringTransactionUpdate(pix, { ...base, accountId: "acc-1" }, today)).not.toHaveProperty("payment_method");
  });

  it("receita nunca é assinatura nem vai para cartão", () => {
    const update = toRecurringTransactionUpdate(series, { ...base, transactionType: "entrada", isSubscription: true, cardId: "card-1" }, today);
    expect(update).toMatchObject({ transaction_type: "entrada", is_subscription: false, card_id: null });
  });

  it("não toca em observação nem na data de término (não estão no formulário)", () => {
    const update = toRecurringTransactionUpdate(series, base, today);
    expect(update).not.toHaveProperty("note");
    expect(update).not.toHaveProperty("end_date");
  });
});

describe("updateRecurringTransaction", () => {
  function client(result: { data: unknown; error: unknown }) {
    const calls: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["update", "eq", "select", "single"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => void) => resolve(result);
    return { calls, client: { from: (table: string) => (calls.push(["from", table]), builder) } as unknown as SupabaseClient<Database> };
  }

  it("só grava se a série ainda estiver na data que a pessoa abriu", async () => {
    const { client: fake, calls } = client({ data: { id: "r1" }, error: null });
    await updateRecurringTransaction(fake, series, base);
    expect(calls).toContainEqual(["from", "recurring_transactions"]);
    expect(calls).toContainEqual(["eq", "next_occurrence_date", "2026-10-10"]);
  });

  it("avisa quando a série avançou enquanto a pessoa editava", async () => {
    const { client: fake } = client({ data: null, error: { code: "PGRST116", message: "no rows" } });
    await expect(updateRecurringTransaction(fake, series, base)).rejects.toThrow(/avançou/);
  });
});
