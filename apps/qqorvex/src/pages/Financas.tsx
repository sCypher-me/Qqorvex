import { useMemo, useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { ChipTabs, Input, SkeletonList } from "@qqorvex/ui";
import {
  useAccounts,
  useCards,
  useCategories,
  useRecurringTransactions,
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
  computeBalances,
  formatSignedBRL,
  formatLocalDate,
  projectRecurringOccurrences,
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
import type { Transaction, TransactionStatus } from "@qqorvex/module-financas";
import { supabase } from "../app/supabase";

type ExtraTab = "contas" | "cartoes" | "categorias" | "recorrencias" | "parcelamentos";
type TransactionFilter = "todos" | "entrada" | "saida" | "transferencia";
type TransactionStatusFilter = "todos" | TransactionStatus;

const EXTRA_TABS: { value: ExtraTab; label: string }[] = [
  { value: "contas", label: "Contas" },
  { value: "cartoes", label: "Cartões e faturas" },
  { value: "categorias", label: "Categorias" },
  { value: "recorrencias", label: "Recorrências" },
  { value: "parcelamentos", label: "Parcelamentos" },
];

const TRANSACTION_FILTERS: { value: TransactionFilter; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "saida", label: "Saídas" },
  { value: "entrada", label: "Entradas" },
  { value: "transferencia", label: "Transferências" },
];

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STATUS_LABEL: Record<TransactionStatus, string> = {
  concluida: "Concluída",
  futura: "Futura",
  pendente: "Pendente",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

function formatPeriodLabel(yearMonth: string): string {
  if (!yearMonth) return "Todo o histórico";
  const [year, month] = yearMonth.split("-");
  return `${MONTHS_SHORT[Number(month) - 1]} ${year}`;
}

function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTransactionsCsv(
  transactions: Transaction[],
  categories: { id: string; name: string }[],
  accounts: { id: string; name: string }[],
  cards: { id: string; nickname: string }[],
  periodMonth: string,
) {
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const accountById = new Map(accounts.map((account) => [account.id, account.name]));
  const cardById = new Map(cards.map((card) => [card.id, card.nickname]));
  const rows = [
    ["Data", "Tipo", "Situação", "Descrição", "Categoria", "Conta/cartão", "Forma de pagamento", "Valor", "Etiquetas"],
    ...transactions.map((transaction) => [
      transaction.date,
      transaction.transaction_type,
      transaction.status,
      transaction.name,
      transaction.category_id ? categoryById.get(transaction.category_id) ?? "" : "",
      transaction.card_id ? cardById.get(transaction.card_id) ?? "" : transaction.account_id ? accountById.get(transaction.account_id) ?? "" : "",
      transaction.payment_method ?? "",
      transaction.amount.toFixed(2).replace(".", ","),
      transaction.tags.join(", "),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qqorvex-financas-${periodMonth || "historico"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

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
  const updateTransaction = useUpdateTransaction(supabase);

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [extraTab, setExtraTab] = useState<ExtraTab>("contas");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("todos");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [periodMonth, setPeriodMonth] = useState(() => formatLocalDate(new Date()).slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>("todos");

  const balances = computeBalances(transactions);
  const periodTransactions = useMemo(
    () => periodMonth ? transactions.filter((transaction) => transaction.date.startsWith(periodMonth)) : transactions,
    [periodMonth, transactions],
  );
  const recurringProjection = useMemo(() => {
    if (!periodMonth) return [];
    const year = Number(periodMonth.slice(0, 4));
    const month = Number(periodMonth.slice(5, 7));
    return projectRecurringOccurrences(
      recurringTransactions,
      `${periodMonth}-01`,
      formatLocalDate(new Date(year, month, 0)),
    );
  }, [periodMonth, recurringTransactions]);
  const periodFlow = useMemo(() => {
    let entries = 0;
    let expenses = 0;
    let plannedEntries = 0;
    let plannedExpenses = 0;
    const representedOccurrences = new Set(
      periodTransactions
        .filter((transaction) => transaction.recurring_transaction_id)
        .map((transaction) => `${transaction.recurring_transaction_id}:${transaction.date}`),
    );
    for (const transaction of periodTransactions) {
      if (transaction.transaction_type === "transferencia" || transaction.status === "cancelada") continue;
      const completed = transaction.status === "concluida";
      const isEntry = transaction.transaction_type === "entrada";
      if (completed && isEntry) entries += transaction.amount;
      else if (completed) expenses += transaction.amount;
      else if (transaction.status === "futura" || transaction.status === "pendente" || transaction.status === "vencida") {
        if (isEntry) plannedEntries += transaction.amount;
        else plannedExpenses += transaction.amount;
      }
    }
    for (const occurrence of recurringProjection) {
      if (representedOccurrences.has(`${occurrence.recurringId}:${occurrence.date}`)) continue;
      if (occurrence.transaction_type === "entrada") plannedEntries += occurrence.amount;
      else plannedExpenses += occurrence.amount;
    }
    return { entries, expenses, net: entries - expenses, plannedEntries, plannedExpenses };
  }, [periodTransactions, recurringProjection]);
  const filteredTransactions = useMemo(() => {
    const query = transactionSearch.trim().toLocaleLowerCase();
    const categoryById = new Map(categories.map((category) => [category.id, category.name]));
    return periodTransactions.filter((transaction) => {
      const matchesType = transactionFilter === "todos" || transaction.transaction_type === transactionFilter;
      const matchesStatus = statusFilter === "todos" || transaction.status === statusFilter;
      const categoryName = transaction.category_id ? categoryById.get(transaction.category_id) : "";
      const matchesSearch = !query || `${transaction.name} ${categoryName ?? ""} ${transaction.tags.join(" ")}`.toLocaleLowerCase().includes(query);
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [categories, periodTransactions, statusFilter, transactionFilter, transactionSearch]);
  const projectedIsNegative = balances.saldoProjetado < 0;
  const selectedDayKey = formatLocalDate(selectedDay);
  const transactionsOnSelectedDay = transactions.filter((t) => t.date === selectedDayKey);
  const projectedOnSelectedDay = projectRecurringOccurrences(recurringTransactions, selectedDayKey, selectedDayKey);
  const selectedDayLabel = selectedDayKey.split("-").reverse().join("/");

  return (
    <div className="qv-page editorial-module-page flex flex-col gap-6 pb-8">
      <section className="qv-hero editorial-module-hero" aria-labelledby="finance-page-title">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="qv-eyebrow text-vex-gold-bright">Movimento financeiro</p>
            <h1 id="finance-page-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-4xl">Finanças</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Uma leitura simples do que entrou, do que saiu e do que já está previsto para os próximos dias.</p>
          </div>
          <div className={`rounded-full border px-3 py-2 text-xs ${projectedIsNegative ? "border-warning/40 bg-warning-bg text-warning" : "border-success/30 bg-success-bg text-success"}`}>
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {projectedIsNegative ? "Saldo projetado pede atenção" : "Saldo projetado sob controle"}
          </div>
        </div>
      </section>

      <section aria-labelledby="finance-summary-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="finance-summary-title" className="font-display text-xl font-semibold text-text-primary">Visão geral</h2>
            <p className="mt-1 text-xs text-text-muted">Valores realizados e projeções baseadas nos seus lançamentos.</p>
          </div>
          <span className="hidden font-mono text-xs text-text-muted sm:block">atualizado agora</span>
        </div>
        <DashboardCards balances={balances} accountCount={accounts.length} />
      </section>

      <section className="qv-card flex flex-col gap-4 p-4 sm:p-5" aria-labelledby="finance-period-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="finance-period-title" className="font-display text-lg font-semibold text-text-primary">Fluxo do período</h2>
            <p className="mt-1 text-xs text-text-muted">Entradas e saídas concluídas; compromissos futuros ficam separados.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="finance-period-month" className="sr-only">Mês do resumo</label>
            <input id="finance-period-month" type="month" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} className="qv-field px-3 py-2 font-mono text-xs" />
            <button type="button" className="qv-btn qv-btn-ghost qv-btn-xs" onClick={() => setPeriodMonth((month) => month ? "" : formatLocalDate(new Date()).slice(0, 7))}>
              {periodMonth ? "Todo o histórico" : "Mês atual"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="qv-well p-3">
            <span className="qv-eyebrow">Entradas realizadas</span>
            <p className="mt-1 font-mono text-lg font-semibold text-success">{formatSignedBRL(periodFlow.entries, "+")}</p>
            {periodFlow.plannedEntries > 0 && <p className="mt-1 text-[11px] text-text-muted">+ {formatSignedBRL(periodFlow.plannedEntries, "")} previstos</p>}
          </div>
          <div className="qv-well p-3">
            <span className="qv-eyebrow">Saídas realizadas</span>
            <p className="mt-1 font-mono text-lg font-semibold text-error">{formatSignedBRL(periodFlow.expenses, "-")}</p>
            {periodFlow.plannedExpenses > 0 && <p className="mt-1 text-[11px] text-text-muted">− {formatSignedBRL(periodFlow.plannedExpenses, "")} previstos</p>}
          </div>
          <div className="qv-well p-3">
            <span className="qv-eyebrow">Resultado realizado · {formatPeriodLabel(periodMonth)}</span>
            <p className={`mt-1 font-mono text-lg font-semibold ${periodFlow.net < 0 ? "text-error" : "text-text-primary"}`}>
              {periodFlow.net < 0 ? "− " : ""}{formatSignedBRL(periodFlow.net, "")}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">Transferências não alteram o resultado.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="new-transaction-title">
        <div>
          <p className="qv-eyebrow text-vex-cyan-bright">Entrada rápida</p>
          <h2 id="new-transaction-title" className="mt-1 font-display text-xl font-semibold text-text-primary">Registrar movimentação</h2>
          <p className="mt-1 text-xs text-text-muted">Lance uma entrada, saída ou transferência. Detalhes extras ficam disponíveis quando precisar.</p>
        </div>
        <NewTransactionForm
          accounts={accounts}
          categories={categories}
          cards={cards}
          vehicles={vehicles.map((v) => ({ id: v.id, nickname: v.nickname }))}
          onCreate={(input) => createTransaction.mutateAsync(input)}
        />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="transactions-title">
          <div className="qv-card gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="transactions-title" className="font-display text-xl font-semibold text-text-primary">Movimentações</h2>
                <p className="mt-1 text-xs text-text-muted">{filteredTransactions.length} {filteredTransactions.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}</p>
                <p className="mt-1 text-[11px] text-text-muted">Período: {formatPeriodLabel(periodMonth)}</p>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Input
                  aria-label="Buscar movimentações"
                  placeholder="Buscar descrição, categoria ou etiqueta..."
                  value={transactionSearch}
                  onChange={(event) => setTransactionSearch(event.target.value)}
                  className="h-10 w-full sm:w-64"
                />
                <select aria-label="Filtrar por situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TransactionStatusFilter)} className="qv-field px-3 text-xs">
                  <option value="todos">Todas as situações</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="qv-btn qv-btn-ghost qv-btn-xs" disabled={filteredTransactions.length === 0} onClick={() => downloadTransactionsCsv(filteredTransactions, categories, accounts, cards, periodMonth)}>
                  Exportar CSV
                </button>
              </div>
            </div>
            <ChipTabs options={TRANSACTION_FILTERS} value={transactionFilter} onChange={setTransactionFilter} />
          </div>
          {isLoading ? (
            <div className="qv-card overflow-hidden">
              <SkeletonList rows={4} />
            </div>
          ) : (
            <TransactionList
              client={supabase}
              transactions={filteredTransactions}
              categories={categories}
              accounts={accounts}
              cards={cards}
              onDelete={(id) => deleteTransaction.mutateAsync(id)}
              onUpdate={(id, input) => updateTransaction.mutateAsync({ id, input })}
              title="Histórico financeiro"
              meta={`${filteredTransactions.length} ${filteredTransactions.length === 1 ? "item" : "itens"}`}
            />
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="qv-card gap-4 p-5" aria-labelledby="financial-calendar-title">
            <div className="flex items-center gap-3">
              <div>
                <h2 id="financial-calendar-title" className="font-display text-lg font-semibold">Calendário financeiro</h2>
                <p className="mt-1 text-xs text-text-muted">Realizado e previsto no mesmo lugar.</p>
              </div>
              <span className="flex-1" />
              <button type="button" className="qv-icon-btn" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button>
              <span className="min-w-[62px] text-center font-mono text-xs text-text-muted">{MONTHS_SHORT[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
              <button type="button" className="qv-icon-btn" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Próximo mês">›</button>
            </div>
            <FinancialCalendarView
              monthAnchor={calendarMonth}
              transactions={transactions}
              recurringTransactions={recurringTransactions}
              selectedDate={selectedDay}
              onSelectDate={setSelectedDay}
            />
            <div className="flex flex-wrap gap-3 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-error" />Saída</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" />Entrada</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full border border-text-muted" />Prevista</span>
            </div>
            <div className="qv-well flex flex-col gap-2 px-3.5 py-3">
              <span className="qv-eyebrow">Dia <span className="font-mono">{selectedDayLabel}</span></span>
              {transactionsOnSelectedDay.length === 0 && projectedOnSelectedDay.length === 0 ? (
                <span className="text-[13px] text-text-secondary">Nada neste dia.</span>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {transactionsOnSelectedDay.map((t) => (
                    <li key={t.id} className="flex items-baseline gap-[10px]">
                      <span className="min-w-0 flex-1 truncate text-[13px]">{t.name}</span>
                      <span className={`whitespace-nowrap font-mono text-xs ${t.transaction_type === "entrada" ? "text-success" : t.transaction_type === "saida" ? "text-error" : "text-text-secondary"}`}>{formatSignedBRL(t.amount, t.transaction_type === "entrada" ? "+" : t.transaction_type === "saida" ? "-" : "")}</span>
                    </li>
                  ))}
                  {projectedOnSelectedDay.map((r) => (
                    <li key={`${r.recurringId}:${r.date}`} className="flex items-baseline gap-[10px]">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text-secondary">{r.name} <span className="text-text-muted">· prevista</span></span>
                      <span className="whitespace-nowrap font-mono text-xs text-text-secondary">{formatSignedBRL(r.amount, r.transaction_type === "entrada" ? "+" : "-")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <BudgetsPanel client={supabase} userId={userId} />
        </aside>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="finance-management-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="qv-eyebrow text-vex-gold-bright">Configuração</p>
            <h2 id="finance-management-title" className="mt-1 font-display text-xl font-semibold text-text-primary">Estrutura financeira</h2>
            <p className="mt-1 text-xs text-text-muted">Contas, cartões, categorias e compromissos recorrentes.</p>
          </div>
          <ChipTabs options={EXTRA_TABS} value={extraTab} onChange={setExtraTab} />
        </div>
        {extraTab === "contas" && <AccountsPanel client={supabase} userId={userId} />}
        {extraTab === "cartoes" && <CardsPanel client={supabase} userId={userId} />}
        {extraTab === "categorias" && <CategoriesPanel client={supabase} userId={userId} />}
        {extraTab === "recorrencias" && <RecurringTransactionsPanel client={supabase} userId={userId} />}
        {extraTab === "parcelamentos" && <InstallmentsPanel client={supabase} userId={userId} />}
      </section>
    </div>
  );
}
