import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState, SkeletonCards } from "@qqorvex/ui";
import { useBudgets, useCategories, useCreateBudget, useRecurringTransactions, useTransactions } from "../hooks/useFinancas";
import { computeBudgetUsage, formatLocalDate, parseBRLInput } from "../service";
import { financeActionError } from "../financeErrors";
import { financeCategoryColor, formatBRL } from "./TransactionList";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function currentYearMonth(): string {
  return formatLocalDate(new Date()).slice(0, 7);
}

function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${MONTHS_SHORT[Number(month) - 1] ?? month} ${year}`;
}

/** Barra: verde abaixo de 80%, âmbar a partir de 80%, vermelho a partir de 100%. */
function budgetColor(pct: number): string {
  if (pct >= 100) return "var(--color-error)";
  if (pct >= 80) return "var(--color-warning)";
  return "var(--color-success)";
}

/**
 * Orçamento é um limite de gasto por categoria de saída num mês (`YYYY-MM`). O gasto exibido é a
 * soma das saídas não canceladas da categoria naquele mês — calculado das transações existentes.
 */
export function BudgetsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { budgets, isLoading } = useBudgets(client);
  const { categories } = useCategories(client);
  const { transactions } = useTransactions(client);
  const { recurringTransactions } = useRecurringTransactions(client);
  const createBudget = useCreateBudget(client, userId);

  const expenseCategories = categories.filter((c) => c.kind === "saida");
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const [categoryId, setCategoryId] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [limitAmount, setLimitAmount] = useState("");
  const [error, setError] = useState("");
  const thisMonth = currentYearMonth();

  const selectedBudget = budgets.find((budget) => budget.category_id === categoryId && budget.year_month === yearMonth);
  useEffect(() => {
    setLimitAmount(selectedBudget ? String(selectedBudget.limit_amount).replace(".", ",") : "");
  }, [selectedBudget?.id, selectedBudget?.limit_amount]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedLimit = parseBRLInput(limitAmount);
    if (!categoryId || !(parsedLimit > 0)) {
      setError("Escolha uma categoria e informe um limite maior que zero.");
      return;
    }
    setError("");
    try {
      await createBudget.mutateAsync({ categoryId, yearMonth, limitAmount: parsedLimit });
      setLimitAmount("");
    } catch (saveError) {
      setError(financeActionError(saveError, "Não foi possível salvar o orçamento. Confira sua conexão e tente novamente."));
    }
  }

  const sortedBudgets = [...budgets].sort((a, b) =>
    a.year_month === b.year_month ? 0 : a.year_month < b.year_month ? 1 : -1,
  );

  return (
    <div className="qv-card p-[18px] flex flex-col gap-[14px]">
      <div className="flex items-center gap-[10px]">
        <span className="text-base font-semibold">Orçamentos</span>
        <span className="flex-1" />
        <span className="font-mono text-xs text-text-muted">{formatYearMonth(thisMonth)}</span>
      </div>
      {isLoading ? (
        <SkeletonCards count={2} className="h-10 w-full rounded-lg" />
      ) : sortedBudgets.length === 0 ? (
        <EmptyState>Nenhum orçamento cadastrado. Defina um limite por categoria abaixo.</EmptyState>
      ) : (
        sortedBudgets.map((budget) => {
          const usage = computeBudgetUsage(transactions, budget.category_id, budget.year_month, recurringTransactions);
          const pct = budget.limit_amount > 0 ? (usage.realized / budget.limit_amount) * 100 : 0;
          const projectedPct = budget.limit_amount > 0 ? ((usage.realized + usage.committed) / budget.limit_amount) * 100 : 0;
          const color = budgetColor(pct);
          const category = categoryById.get(budget.category_id);
          return (
            <div key={budget.id} className="flex flex-col gap-[7px]">
              <div className="flex items-baseline gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0 self-center"
                  style={{ background: financeCategoryColor(category?.id) }}
                />
                <span className="flex-1 min-w-0 text-[13px] truncate">
                  {category?.name ?? "Categoria removida"}
                  {budget.year_month !== thisMonth && (
                    <span className="font-mono text-[11px] text-text-muted ml-2">{formatYearMonth(budget.year_month)}</span>
                  )}
                </span>
                <span className="font-mono text-xs whitespace-nowrap" style={{ color }}>
                  {formatBRL(usage.realized)} / {formatBRL(budget.limit_amount)}
                </span>
              </div>
              <div className="h-[5px] rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
              </div>
              {usage.committed > 0 && (
                <span className="text-[11px] text-text-muted">
                  Total com compromissos previstos: {formatBRL(usage.realized + usage.committed)}
                  {projectedPct >= 100 && <span className="text-warning"> · pode ultrapassar o limite</span>}
                </span>
              )}
            </div>
          );
        })
      )}
      {expenseCategories.length === 0 ? (
        <EmptyState className="qv-row-top pt-3 text-xs">
          Crie uma categoria de saída (aba Categorias) para poder definir um orçamento.
        </EmptyState>
      ) : (
        <form onSubmit={handleSubmit} className="qv-row-top pt-[14px] flex flex-wrap gap-2">
          <select
            value={categoryId}
            onChange={(e) => {
              const nextCategoryId = e.target.value;
              setCategoryId(nextCategoryId);
              const matching = budgets.find((budget) => budget.category_id === nextCategoryId && budget.year_month === yearMonth);
              setLimitAmount(matching ? String(matching.limit_amount).replace(".", ",") : "");
            }}
            aria-label="Categoria do orçamento"
            className="qv-field flex-[1_1_140px] py-2 px-3 text-[13px]"
          >
            <option value="">Categoria</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => {
              setYearMonth(e.target.value);
              const matching = budgets.find((budget) => budget.category_id === categoryId && budget.year_month === e.target.value);
              setLimitAmount(matching ? String(matching.limit_amount).replace(".", ",") : "");
            }}
            aria-label="Mês"
            required
            className="qv-field flex-[0_1_150px] py-2 px-3 font-mono text-[13px]"
          />
          <input
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            placeholder="Limite R$"
            aria-label="Limite"
            inputMode="decimal"
            required
            className="qv-field flex-[0_1_110px] py-2 px-3 font-mono text-[13px]"
          />
          <Button type="submit" variant="primary" size="sm" disabled={createBudget.isPending}>
            {createBudget.isPending ? "Salvando…" : selectedBudget ? "Atualizar limite" : "Definir limite"}
          </Button>
        </form>
      )}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}
