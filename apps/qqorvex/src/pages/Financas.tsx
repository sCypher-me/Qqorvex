import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartPieSliceIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  FileArrowUpIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import {
  AccountsPanel,
  BudgetsPanel,
  CardsPanel,
  CategoriesPanel,
  FinancialCalendar,
  ImportStatementDialog,
  InstallmentsPanel,
  RecurringTransactionsPanel,
  TransactionForm,
  TransactionTable,
  addMonthsToDate,
  computeBalances,
  financeCategoryColor,
  formatBRL,
  formatBRLCompact,
  formatDayMonth,
  formatLocalDate,
  formatMonthLong,
  formatMonthShort,
  monthlyTotals,
  spendingByCategory,
  summarizeMonth,
  upcomingBills,
  useAccounts,
  useBudgets,
  useCards,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useGenerateOccurrence,
  useRecurringTransactions,
  useTransactions,
  useUpdateTransaction,
  useUpdateTransactionStatus,
  type NewTransactionInput,
  type Transaction,
  type TransactionStatus,
} from "@qqorvex/module-financas";
import { useVehicles } from "@qqorvex/module-vida-pessoal";
import { BarChart, Button, DonutChart, EmptyState, IconButton, Notice, PageContainer, PageHeader, ProgressBar, Segmented, Select, Skeleton, Tabs, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";

type Tab = "visao" | "transacoes" | "orcamentos" | "contas" | "planejamento";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "visao", label: "Visão geral" },
  { value: "transacoes", label: "Transações" },
  { value: "orcamentos", label: "Orçamentos" },
  { value: "contas", label: "Contas e cartões" },
  { value: "planejamento", label: "Planejamento" },
];

function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(transactions: Transaction[], categoryName: (id: string | null) => string, accountName: (t: Transaction) => string, label: string) {
  const rows = [
    ["Data", "Tipo", "Situação", "Descrição", "Categoria", "Conta/cartão", "Valor", "Etiquetas"],
    ...transactions.map((t) => [t.date, t.transaction_type, t.status, t.name, categoryName(t.category_id), accountName(t), t.amount.toFixed(2).replace(".", ","), t.tags.join(", ")]),
  ];
  const csv = `﻿${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qqorvex-financas-${label}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Kpi({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone?: "success" | "danger" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-[12.5px] font-medium text-fg-3 [&_svg]:size-4">
        <span className="text-fg-4">{icon}</span>
        {label}
      </p>
      <p className={cx("truncate font-display text-[22px] font-semibold tabular-nums tracking-[-0.01em]", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-fg")}>{value}</p>
      {hint && <p className="truncate text-xs text-fg-3">{hint}</p>}
    </div>
  );
}

export function FinancasPage() {
  const { userId } = useAccount();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (TABS.some((item) => item.value === searchParams.get("aba")) ? searchParams.get("aba") : "visao") as Tab;
  const setTab = (value: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (value === "visao") next.delete("aba");
    else next.set("aba", value);
    setSearchParams(next, { replace: true });
  };
  const [month, setMonth] = useState(() => formatLocalDate(new Date()).slice(0, 7));
  const [form, setForm] = useState<{ transaction: Transaction | null; defaults?: Partial<NewTransactionInput> } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { transactions, isLoading, error } = useTransactions(supabase);
  const { accounts } = useAccounts(supabase);
  const { categories } = useCategories(supabase);
  const { cards } = useCards(supabase);
  const { budgets } = useBudgets(supabase);
  const { recurringTransactions } = useRecurringTransactions(supabase);
  const { vehicles } = useVehicles(supabase);
  const createTransaction = useCreateTransaction(supabase, userId);
  const updateTransaction = useUpdateTransaction(supabase);
  const updateStatus = useUpdateTransactionStatus(supabase);
  const deleteTransaction = useDeleteTransaction(supabase);
  const generateOccurrence = useGenerateOccurrence(supabase, userId);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const today = formatLocalDate(new Date());
  const isCurrentMonth = month === today.slice(0, 7);
  const balances = computeBalances(transactions);
  const summary = summarizeMonth(transactions, recurringTransactions, month);
  const previous = summarizeMonth(transactions, recurringTransactions, addMonthsToDate(`${month}-01`, -1).slice(0, 7));
  const history = monthlyTotals(transactions, month, 6);
  const byCategory = spendingByCategory(transactions, month);
  const bills = upcomingBills(transactions, recurringTransactions, today, 14);
  const savingsRate = summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : null;
  const expenseDelta = previous.expense > 0 ? Math.round(((summary.expense - previous.expense) / previous.expense) * 100) : null;

  function markDone(transaction: Transaction) {
    updateStatus.mutate(
      { id: transaction.id, status: "concluida" },
      { onSuccess: () => toast({ title: transaction.transaction_type === "entrada" ? "Marcada como recebida" : "Marcada como paga", description: transaction.name, tone: "success" }) },
    );
  }

  const header = (
    <PageHeader
      title="Finanças"
      description={isLoading ? "Carregando…" : `Saldo em contas: ${balances.saldoAtual < 0 ? "− " : ""}${formatBRL(balances.saldoAtual)} · projetado ${balances.saldoProjetado < 0 ? "− " : ""}${formatBRL(balances.saldoProjetado)}`}
      actions={
        <>
          <div className="flex items-center rounded-lg border border-line bg-raised shadow-sm">
            <IconButton label="Mês anterior" onClick={() => setMonth(addMonthsToDate(`${month}-01`, -1).slice(0, 7))} className="rounded-r-none">
              <CaretLeftIcon />
            </IconButton>
            <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="h-8 min-w-[132px] border-x border-line px-3 text-[13px] font-medium text-fg-2 hover:bg-hover hover:text-fg" title="Voltar ao mês atual">
              {formatMonthLong(month)}
            </button>
            <IconButton label="Próximo mês" onClick={() => setMonth(addMonthsToDate(`${month}-01`, 1).slice(0, 7))} className="rounded-l-none">
              <CaretRightIcon />
            </IconButton>
          </div>
          <Button size="sm" variant="secondary" leadingIcon={<FileArrowUpIcon size={15} />} onClick={() => setImportOpen(true)}>
            Importar extrato
          </Button>
          <Button size="sm" leadingIcon={<PlusIcon size={15} weight="bold" />} onClick={() => setForm({ transaction: null })}>
            Novo lançamento
          </Button>
        </>
      }
    >
      <Tabs label="Seções de Finanças" options={TABS} value={tab} onChange={setTab} />
    </PageHeader>
  );

  return (
    <PageContainer width="wide">
      {header}
      {error && <Notice title="Não foi possível carregar suas finanças">Verifique a conexão. Nenhum dado foi perdido.</Notice>}

      {tab === "visao" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Receitas" icon={<ArrowUpIcon />} value={formatBRL(summary.income)} tone="success" hint={summary.plannedIncome ? `+ ${formatBRL(summary.plannedIncome)} previstas` : "no mês"} />
            <Kpi label="Despesas" icon={<ArrowDownIcon />} value={formatBRL(summary.expense)} hint={summary.plannedExpense ? `+ ${formatBRL(summary.plannedExpense)} previstas` : expenseDelta !== null ? `${expenseDelta > 0 ? "+" : ""}${expenseDelta}% vs. mês anterior` : "no mês"} />
            <Kpi label="Resultado" icon={<WalletIcon />} value={`${summary.net < 0 ? "− " : ""}${formatBRL(summary.net)}`} tone={summary.net < 0 ? "danger" : undefined} hint={savingsRate !== null ? `${savingsRate}% da renda ${savingsRate >= 0 ? "poupada" : "além do ganho"}` : "Sem receitas no mês"} />
            <Kpi
              label="Previsão de fechamento"
              icon={<ChartPieSliceIcon />}
              value={`${summary.net + summary.plannedIncome - summary.plannedExpense < 0 ? "− " : ""}${formatBRL(summary.net + summary.plannedIncome - summary.plannedExpense)}`}
              tone={summary.net + summary.plannedIncome - summary.plannedExpense < 0 ? "danger" : undefined}
              hint="Resultado + o que ainda está previsto"
            />
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-fg">Receitas e despesas</h2>
                  <p className="text-xs text-fg-3">Últimos 6 meses, só o que já aconteceu</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-fg-2">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-cat-1" /> Receitas</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-cat-2" /> Despesas</span>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <BarChart
                  label="Receitas e despesas por mês nos últimos seis meses"
                  height={220}
                  data={history.map((item) => ({ label: formatMonthShort(item.month), fullLabel: formatMonthLong(item.month), values: { receitas: item.income, despesas: item.expense } }))}
                  series={[
                    { key: "receitas", label: "Receitas" },
                    { key: "despesas", label: "Despesas" },
                  ]}
                  highlightIndex={5}
                  format={formatBRL}
                  axisFormat={formatBRLCompact}
                />
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <h2 className="text-[14px] font-semibold text-fg">Para onde foi o dinheiro</h2>
              <p className="mb-4 text-xs text-fg-3">Despesas de {formatMonthLong(month).toLowerCase()} por categoria</p>
              {byCategory.length === 0 ? (
                <EmptyState size="sm" icon={<ChartPieSliceIcon />} title="Sem despesas no mês" description="Quando você registrar gastos, a divisão por categoria aparece aqui." />
              ) : (
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  <DonutChart
                    label="Despesas por categoria"
                    size={148}
                    slices={byCategory.slice(0, 7).map((item) => ({ key: item.categoryId ?? "none", label: item.categoryId ? categoryById.get(item.categoryId)?.name ?? "Categoria" : "Sem categoria", value: item.amount, color: financeCategoryColor(item.categoryId) }))}
                    format={formatBRL}
                    center={
                      <>
                        <span className="text-2xs text-fg-4">Total</span>
                        <span className="font-display text-[15px] font-semibold tabular-nums">{formatBRLCompact(summary.expense)}</span>
                      </>
                    }
                  />
                  <ul className="flex w-full min-w-0 flex-1 flex-col gap-2">
                    {byCategory.slice(0, 6).map((item) => {
                      const budget = budgets.find((entry) => entry.category_id === item.categoryId && entry.year_month === month);
                      const pct = summary.expense ? Math.round((item.amount / summary.expense) * 100) : 0;
                      return (
                        <li key={item.categoryId ?? "none"} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[13px]">
                            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: financeCategoryColor(item.categoryId) }} />
                            <span className="min-w-0 flex-1 truncate text-fg">{item.categoryId ? categoryById.get(item.categoryId)?.name ?? "Categoria" : "Sem categoria"}</span>
                            <span className="text-xs text-fg-4">{pct}%</span>
                            <span className="w-24 text-right tabular-nums text-fg-2">{formatBRL(item.amount)}</span>
                          </div>
                          {budget && (
                            <div className="pl-4">
                              <ProgressBar value={(item.amount / budget.limit_amount) * 100} height={3} tone={item.amount > budget.limit_amount ? "danger" : item.amount > budget.limit_amount * 0.8 ? "warning" : "success"} label={`Orçamento de ${categoryById.get(item.categoryId ?? "")?.name}`} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-line bg-surface">
              <header className="flex items-center gap-2 border-b border-line-soft px-4 py-3 sm:px-5">
                <ReceiptIcon size={17} className="text-fg-4" />
                <h2 className="flex-1 text-[14px] font-semibold text-fg">Próximas contas</h2>
                <span className="text-xs text-fg-4">14 dias</span>
              </header>
              {bills.length === 0 ? (
                <EmptyState size="sm" icon={<CheckCircleIcon />} title="Nada a pagar nas próximas duas semanas" description="Contas agendadas e recorrências aparecem aqui antes de vencer." />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {bills.slice(0, 8).map((bill) => (
                    <li key={bill.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                      <span className={cx("w-12 shrink-0 text-xs tabular-nums", bill.overdue ? "font-medium text-danger" : "text-fg-3")}>{formatDayMonth(bill.date)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-fg">{bill.name}</span>
                        <span className="text-2xs text-fg-4">{bill.overdue ? "Vencida" : bill.transaction ? "Agendada" : "Recorrência prevista"}</span>
                      </span>
                      <span className={cx("text-[13.5px] tabular-nums", bill.type === "entrada" ? "text-success" : "text-fg")}>{bill.type === "entrada" ? "+ " : "− "}{formatBRL(bill.amount)}</span>
                      {bill.transaction ? (
                        <Button size="xs" variant="ghost" onClick={() => markDone(bill.transaction!)}>
                          {bill.type === "entrada" ? "Recebida" : "Paga"}
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            const recurring = recurringTransactions.find((item) => item.id === bill.recurringId);
                            if (recurring && recurring.next_occurrence_date === bill.date) generateOccurrence.mutate(recurring, { onSuccess: () => toast({ title: "Lançamento criado", description: bill.name, tone: "success" }) });
                            else toast({ title: "Lance primeiro a cobrança anterior desta recorrência", tone: "info" });
                          }}
                        >
                          Lançar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface">
              <header className="flex items-center gap-2 border-b border-line-soft px-4 py-3 sm:px-5">
                <WalletIcon size={17} className="text-fg-4" />
                <h2 className="flex-1 text-[14px] font-semibold text-fg">Últimos lançamentos</h2>
                <Button size="xs" variant="ghost" onClick={() => setTab("transacoes")}>Ver todos</Button>
              </header>
              {transactions.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={<WalletIcon />}
                  title="Comece registrando um gasto"
                  description="Ou importe o extrato do seu banco para já ter o histórico."
                  action={<Button size="xs" variant="secondary" onClick={() => setImportOpen(true)}>Importar extrato</Button>}
                />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {transactions.filter((t) => t.status === "concluida").slice(0, 7).map((transaction) => (
                    <li key={transaction.id}>
                      <button type="button" onClick={() => setForm({ transaction })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover sm:px-5">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: financeCategoryColor(transaction.category_id) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] text-fg">{transaction.name}</span>
                          <span className="text-2xs text-fg-4">{formatDayMonth(transaction.date)} · {transaction.category_id ? categoryById.get(transaction.category_id)?.name : transaction.transaction_type === "transferencia" ? "Transferência" : "Sem categoria"}</span>
                        </span>
                        <span className={cx("text-[13.5px] tabular-nums", transaction.transaction_type === "entrada" ? "text-success" : transaction.transaction_type === "transferencia" ? "text-fg-3" : "text-fg")}>
                          {transaction.transaction_type === "entrada" ? "+ " : transaction.transaction_type === "saida" ? "− " : ""}
                          {formatBRL(transaction.amount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === "transacoes" && (
        <TransactionsTab
          month={month}
          isCurrentMonth={isCurrentMonth}
          transactions={transactions}
          isLoading={isLoading}
          onEdit={(transaction) => setForm({ transaction })}
          onDuplicate={(transaction) => setForm({ transaction: null, defaults: { transactionType: transaction.transaction_type, name: transaction.name, amount: transaction.amount, categoryId: transaction.category_id ?? undefined, date: today } })}
          onMarkDone={markDone}
          onDelete={(transaction) => deleteTransaction.mutateAsync(transaction.id).then(() => toast({ title: "Lançamento excluído", description: transaction.name }))}
          categories={categories}
          accounts={accounts}
          cards={cards}
        />
      )}

      {tab === "orcamentos" && <BudgetsPanel client={supabase} userId={userId} yearMonth={month} />}

      {tab === "contas" && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            <AccountsPanel client={supabase} userId={userId} />
            <CategoriesPanel client={supabase} userId={userId} />
          </div>
          <CardsPanel client={supabase} userId={userId} />
        </div>
      )}

      {tab === "planejamento" && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <RecurringTransactionsPanel client={supabase} userId={userId} />
            <InstallmentsPanel client={supabase} userId={userId} transactions={transactions} />
          </div>
          <FinancialCalendar transactions={transactions} recurringTransactions={recurringTransactions} />
        </div>
      )}

      <TransactionForm
        isOpen={form !== null}
        transaction={form?.transaction ?? null}
        defaults={form?.defaults}
        accounts={accounts}
        categories={categories}
        cards={cards}
        vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, nickname: vehicle.nickname }))}
        onClose={() => setForm(null)}
        onCreate={async (input) => {
          await createTransaction.mutateAsync(input);
          toast({ title: input.transactionType === "entrada" ? "Receita registrada" : input.transactionType === "saida" ? "Despesa registrada" : "Transferência registrada", description: `${input.name} · ${formatBRL(input.amount)}`, tone: "success" });
        }}
        onUpdate={async (id, input) => {
          await updateTransaction.mutateAsync({ id, input });
          toast({ title: "Lançamento atualizado", description: input.name, tone: "success" });
        }}
      />
      <ImportStatementDialog isOpen={importOpen} onClose={() => setImportOpen(false)} client={supabase} userId={userId} accounts={accounts} categories={categories} existing={transactions} />
    </PageContainer>
  );
}

type TypeFilter = "todos" | "saida" | "entrada" | "transferencia";

function TransactionsTab({
  month,
  isCurrentMonth,
  transactions,
  isLoading,
  categories,
  accounts,
  cards,
  onEdit,
  onDuplicate,
  onMarkDone,
  onDelete,
}: {
  month: string;
  isCurrentMonth: boolean;
  transactions: Transaction[];
  isLoading: boolean;
  categories: ReturnType<typeof useCategories>["categories"];
  accounts: ReturnType<typeof useAccounts>["accounts"];
  cards: ReturnType<typeof useCards>["cards"];
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onMarkDone: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("todos");
  const [status, setStatus] = useState<"todos" | TransactionStatus>("todos");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [allPeriods, setAllPeriods] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const names = new Map(categories.map((category) => [category.id, category.name.toLowerCase()]));
    return transactions.filter((transaction) => {
      if (!allPeriods && !transaction.date.startsWith(month)) return false;
      if (type !== "todos" && transaction.transaction_type !== type) return false;
      if (status !== "todos" && transaction.status !== status) return false;
      if (categoryId && transaction.category_id !== categoryId) return false;
      if (accountId && transaction.account_id !== accountId && transaction.card_id !== accountId && transaction.transfer_to_account_id !== accountId) return false;
      if (term && !`${transaction.name} ${names.get(transaction.category_id ?? "") ?? ""} ${transaction.tags.join(" ")}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [accountId, allPeriods, categories, categoryId, month, query, status, transactions, type]);

  const income = filtered.filter((t) => t.transaction_type === "entrada" && t.status !== "cancelada").reduce((sum, t) => sum + t.amount, 0);
  const expense = filtered.filter((t) => t.transaction_type === "saida" && t.status !== "cancelada").reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar descrição, categoria ou etiqueta" aria-label="Buscar lançamentos" data-size="sm" className="q-input pl-8!" />
          </div>
          <Segmented
            label="Tipo"
            size="sm"
            value={type}
            onChange={setType}
            options={[
              { value: "todos", label: "Todos" },
              { value: "saida", label: "Despesas" },
              { value: "entrada", label: "Receitas" },
              { value: "transferencia", label: "Transf." },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <Select fieldSize="sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Categoria" className="sm:w-auto">
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select fieldSize="sm" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Conta ou cartão" className="sm:w-auto">
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                Cartão · {card.nickname}
              </option>
            ))}
          </Select>
          <Select fieldSize="sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Situação" className="sm:w-auto">
            <option value="todos">Todas as situações</option>
            <option value="concluida">Concluídas</option>
            <option value="futura">Agendadas</option>
            <option value="pendente">Pendentes</option>
            <option value="vencida">Vencidas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
          <label className="flex h-8 items-center gap-2 px-1 text-xs text-fg-3">
            <input type="checkbox" checked={allPeriods} onChange={(event) => setAllPeriods(event.target.checked)} />
            Todo o período
          </label>
          <span className="hidden flex-1 sm:block" />
          <Button
            size="sm"
            variant="ghost"
            leadingIcon={<DownloadSimpleIcon size={15} />}
            disabled={filtered.length === 0}
            onClick={() =>
              exportCsv(
                filtered,
                (id) => categories.find((category) => category.id === id)?.name ?? "",
                (t) => (t.card_id ? cards.find((card) => card.id === t.card_id)?.nickname ?? "" : accounts.find((account) => account.id === t.account_id)?.name ?? ""),
                allPeriods ? "historico" : month,
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <p className="text-xs text-fg-3">
        {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} {allPeriods ? "no histórico" : `em ${formatMonthLong(month).toLowerCase()}`} · <span className="text-success">+ {formatBRL(income)}</span> · − {formatBRL(expense)}
        {!allPeriods && !isCurrentMonth && " · use as setas no topo para mudar o mês"}
      </p>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line">
          <EmptyState icon={<MagnifyingGlassIcon />} title="Nenhum lançamento encontrado" description="Ajuste os filtros, mude o mês ou marque “Todo o período”." />
        </div>
      ) : (
        <TransactionTable client={supabase} transactions={filtered} categories={categories} accounts={accounts} cards={cards} onEdit={onEdit} onDuplicate={onDuplicate} onMarkDone={onMarkDone} onDelete={onDelete} />
      )}
    </div>
  );
}
