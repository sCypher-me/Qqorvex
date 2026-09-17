import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { ChipTabs, EmptyState } from "@qqorvex/ui";
import {
  useAccounts,
  useCards,
  useCategories,
  useRecurringTransactions,
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  computeBalances,
  formatSignedBRL,
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

type ExtraTab = "contas" | "cartoes" | "categorias" | "recorrencias" | "parcelamentos";

const EXTRA_TABS: { value: ExtraTab; label: string }[] = [
  { value: "contas", label: "Contas" },
  { value: "cartoes", label: "Cartões e faturas" },
  { value: "categorias", label: "Categorias" },
  { value: "recorrencias", label: "Recorrências" },
  { value: "parcelamentos", label: "Parcelamentos" },
];

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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
  const [extraTab, setExtraTab] = useState<ExtraTab>("contas");

  const balances = computeBalances(transactions);
  const selectedDayKey = selectedDay.toISOString().slice(0, 10);
  const transactionsOnSelectedDay = transactions.filter((t) => t.date === selectedDayKey);
  const projectedOnSelectedDay = recurringTransactions.filter(
    (r) => r.status === "ativa" && r.next_occurrence_date === selectedDayKey,
  );
  const selectedDayLabel = selectedDayKey.split("-").reverse().join("/");

  return (
    <div className="flex flex-col gap-5">
      <DashboardCards balances={balances} accountCount={accounts.length} />

      <NewTransactionForm
        accounts={accounts}
        categories={categories}
        cards={cards}
        vehicles={vehicles.map((v) => ({ id: v.id, nickname: v.nickname }))}
        onCreate={(input) => createTransaction.mutate(input)}
      />

      <div className="grid gap-5 items-start grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {isLoading ? (
          <div className="qv-card">
            <EmptyState className="px-[18px] py-4">Carregando transações...</EmptyState>
          </div>
        ) : (
          <TransactionList
            client={supabase}
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            cards={cards}
            onDelete={(id) => deleteTransaction.mutate(id)}
          />
        )}

        <div className="flex flex-col gap-4">
          <div className="qv-card p-[18px] flex flex-col gap-[14px]">
            <div className="flex items-center gap-[10px]">
              <span className="text-base font-semibold">Calendário financeiro</span>
              <span className="flex-1" />
              <button
                type="button"
                className="qv-icon-btn"
                onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <span className="font-mono text-xs text-text-muted min-w-[62px] text-center">
                {MONTHS_SHORT[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <button
                type="button"
                className="qv-icon-btn"
                onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>
            <FinancialCalendarView
              monthAnchor={calendarMonth}
              transactions={transactions}
              recurringTransactions={recurringTransactions}
              selectedDate={selectedDay}
              onSelectDate={setSelectedDay}
            />
            <span className="text-xs text-text-muted">
              Pontos em vermelho são saídas; verde, entradas. Ponto vazado = recorrência prevista.
            </span>

            <div className="qv-well px-[14px] py-3 flex flex-col gap-2">
              <span className="qv-eyebrow">
                Dia <span className="font-mono">{selectedDayLabel}</span>
              </span>
              {transactionsOnSelectedDay.length === 0 && projectedOnSelectedDay.length === 0 ? (
                <span className="text-[13px] text-text-secondary">Nada neste dia.</span>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {transactionsOnSelectedDay.map((t) => (
                    <li key={t.id} className="flex items-baseline gap-[10px]">
                      <span className="flex-1 min-w-0 text-[13px] truncate">{t.name}</span>
                      <span
                        className={`font-mono text-xs whitespace-nowrap ${
                          t.transaction_type === "entrada"
                            ? "text-success"
                            : t.transaction_type === "saida"
                              ? "text-error"
                              : "text-text-secondary"
                        }`}
                      >
                        {formatSignedBRL(
                          t.amount,
                          t.transaction_type === "entrada" ? "+" : t.transaction_type === "saida" ? "-" : "",
                        )}
                      </span>
                    </li>
                  ))}
                  {projectedOnSelectedDay.map((r) => (
                    <li key={r.id} className="flex items-baseline gap-[10px]">
                      <span className="flex-1 min-w-0 text-[13px] text-text-secondary truncate">
                        {r.name} <span className="text-text-muted">· prevista</span>
                      </span>
                      <span className="font-mono text-xs whitespace-nowrap text-text-secondary">
                        {formatSignedBRL(r.amount, r.transaction_type === "entrada" ? "+" : "-")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <BudgetsPanel client={supabase} userId={userId} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ChipTabs options={EXTRA_TABS} value={extraTab} onChange={setExtraTab} />
        {extraTab === "contas" && <AccountsPanel client={supabase} userId={userId} />}
        {extraTab === "cartoes" && <CardsPanel client={supabase} userId={userId} />}
        {extraTab === "categorias" && <CategoriesPanel client={supabase} userId={userId} />}
        {extraTab === "recorrencias" && <RecurringTransactionsPanel client={supabase} userId={userId} />}
        {extraTab === "parcelamentos" && <InstallmentsPanel client={supabase} userId={userId} />}
      </div>
    </div>
  );
}
