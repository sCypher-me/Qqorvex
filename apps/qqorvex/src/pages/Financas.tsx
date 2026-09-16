import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, Card } from "@qqorvex/ui";
import {
  useAccounts,
  useCards,
  useCategories,
  useRecurringTransactions,
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  computeBalances,
  AccountsPanel,
  BudgetsPanel,
  CardsPanel,
  CategoriesPanel,
  DashboardCards,
  FinancialCalendarView,
  InstallmentsPanel,
  NewTransactionForm,
  RecurringTransactionsPanel,
  TransactionList,
} from "@qqorvex/module-financas";
import { useVehicles } from "@qqorvex/module-vida-pessoal";
import { supabase } from "../app/supabase";

export function FinancasPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const { transactions, isLoading } = useTransactions(supabase);
  const { accounts } = useAccounts(supabase);
  const { categories } = useCategories(supabase);
  const { cards } = useCards(supabase);
  const { vehicles } = useVehicles(supabase);
  const { recurringTransactions } = useRecurringTransactions(supabase);
  const createTransaction = useCreateTransaction(supabase, userId);
  const deleteTransaction = useDeleteTransaction(supabase);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const balances = computeBalances(transactions);
  const selectedDayKey = selectedDay.toISOString().slice(0, 10);
  const transactionsOnSelectedDay = transactions.filter((t) => t.date === selectedDayKey);
  const projectedOnSelectedDay = recurringTransactions.filter(
    (r) => r.status === "ativa" && r.next_occurrence_date === selectedDayKey,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Finanças</h1>
      </div>

      <div className="w-full max-w-3xl">
        <DashboardCards balances={balances} />
      </div>

      <div className="w-full max-w-3xl">
        <NewTransactionForm
          accounts={accounts}
          categories={categories}
          cards={cards}
          vehicles={vehicles.map((v) => ({ id: v.id, nickname: v.nickname }))}
          onCreate={(input) => createTransaction.mutate(input)}
        />
      </div>

      <div className="w-full max-w-3xl">
        {isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : (
          <TransactionList client={supabase} transactions={transactions} onDelete={(id) => deleteTransaction.mutate(id)} />
        )}
      </div>

      <Card className="w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Calendário Financeiro</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="chip"
              onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              aria-label="Mês anterior"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="chip"
              onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              aria-label="Próximo mês"
            >
              ›
            </Button>
          </div>
        </div>
        <FinancialCalendarView
          monthAnchor={calendarMonth}
          transactions={transactions}
          recurringTransactions={recurringTransactions}
          selectedDate={selectedDay}
          onSelectDate={setSelectedDay}
        />
        {transactionsOnSelectedDay.length === 0 && projectedOnSelectedDay.length === 0 ? (
          <p className="font-sans text-xs text-text-secondary-warm">Nada em {selectedDayKey}.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {transactionsOnSelectedDay.map((t) => (
              <li key={t.id} className="font-sans text-xs text-text-primary">
                R$ {t.amount.toFixed(2)} — {t.name}
              </li>
            ))}
            {projectedOnSelectedDay.map((r) => (
              <li key={r.id} className="font-sans text-xs text-text-secondary-warm">
                (projetado) R$ {r.amount.toFixed(2)} — {r.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        <AccountsPanel client={supabase} userId={userId} />
        <CardsPanel client={supabase} userId={userId} />
      </div>

      <div className="w-full max-w-3xl">
        <CategoriesPanel client={supabase} userId={userId} />
      </div>

      <div className="w-full max-w-3xl">
        <RecurringTransactionsPanel client={supabase} userId={userId} />
      </div>

      <div className="w-full max-w-3xl">
        <InstallmentsPanel client={supabase} userId={userId} />
      </div>

      <div className="w-full max-w-3xl">
        <BudgetsPanel client={supabase} userId={userId} />
      </div>
    </main>
  );
}
