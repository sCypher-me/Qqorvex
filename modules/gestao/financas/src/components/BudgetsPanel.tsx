import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useBudgets, useCategories, useCreateBudget } from "../hooks/useFinancas";

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Orçamento é um limite de gasto por categoria de saída num mês (`YYYY-MM`). */
export function BudgetsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { budgets, isLoading } = useBudgets(client);
  const { categories } = useCategories(client);
  const createBudget = useCreateBudget(client, userId);

  const expenseCategories = categories.filter((c) => c.kind === "saida");
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const [categoryId, setCategoryId] = useState("");
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [limitAmount, setLimitAmount] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedLimit = Number(limitAmount);
    if (!categoryId || !(parsedLimit > 0)) return;
    createBudget.mutate({ categoryId, yearMonth, limitAmount: parsedLimit });
    setLimitAmount("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Orçamentos</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : budgets.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum orçamento cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {budgets.map((budget) => (
            <li key={budget.id} className="text-sm text-text-primary">
              {categoryById.get(budget.category_id)?.name ?? "Categoria removida"} · {budget.year_month} · limite R${" "}
              {budget.limit_amount.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      {expenseCategories.length === 0 ? (
        <p className="font-sans text-xs text-text-secondary-warm">Crie uma categoria de saída para poder definir um orçamento.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
          >
            <option value="">Categoria...</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
          />
          <input
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            placeholder="Limite"
            type="number"
            step="0.01"
            className="w-28 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
          />
          <Button type="submit" variant="secondary">
            Definir
          </Button>
        </form>
      )}
    </div>
  );
}
