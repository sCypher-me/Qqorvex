import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CopyIcon,
  DotsThreeIcon,
  LightningIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  StackIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, Checkbox, DropdownMenu, EmptyState, IconButton, Input, Modal, Notice, ProgressBar, Segmented, Select, SkeletonList, cx, useToast } from "@qqorvex/ui";
import {
  useAccounts,
  useBudgets,
  useCards,
  useCategories,
  useCreateBudget,
  useCreateInstallmentPurchase,
  useCreateRecurringTransaction,
  useDeleteBudget,
  useGenerateOccurrence,
  useInstallments,
  useRecurringTransactions,
  useTransactions,
  useUpdateRecurringStatus,
} from "../hooks/useFinancas";
import { addMonthsToDate, computeBudgetUsage, formatLocalDate, parseBRLInput, projectRecurringOccurrences } from "../service";
import { financeActionError } from "../financeErrors";
import { financeCategoryColor, formatBRL, formatDayMonth, formatMonthLong } from "../format";
import type { RecurrenceFrequency, RecurringTransaction, Transaction } from "../types";

/* ─────────────────────────── Orçamentos ─────────────────────────── */

function budgetTone(pct: number): "success" | "warning" | "danger" {
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "success";
}

/**
 * Limite mensal por categoria de despesa. Mostra o realizado e o comprometido (agendado +
 * recorrências previstas) contra o limite; categorias sem limite aparecem para configurar.
 */
export function BudgetsPanel({ client, userId, yearMonth }: { client: SupabaseClient<Database>; userId: string; yearMonth: string }) {
  const { toast } = useToast();
  const { budgets, isLoading } = useBudgets(client);
  const { categories } = useCategories(client);
  const { transactions } = useTransactions(client);
  const { recurringTransactions } = useRecurringTransactions(client);
  const createBudget = useCreateBudget(client, userId);
  const deleteBudget = useDeleteBudget(client);
  const [editing, setEditing] = useState<{ categoryId: string; value: string } | null>(null);
  const expenseCategories = categories.filter((category) => category.kind === "saida");
  const monthBudgets = budgets.filter((budget) => budget.year_month === yearMonth);
  const previousMonth = addMonthsToDate(`${yearMonth}-01`, -1).slice(0, 7);
  const previousBudgets = budgets.filter((budget) => budget.year_month === previousMonth);

  const rows = expenseCategories
    .map((category) => {
      const budget = monthBudgets.find((item) => item.category_id === category.id) ?? null;
      const usage = computeBudgetUsage(transactions, category.id, yearMonth, recurringTransactions);
      return { category, budget, usage };
    })
    .sort((a, b) => Number(Boolean(b.budget)) - Number(Boolean(a.budget)) || b.usage.realized - a.usage.realized);
  const withBudget = rows.filter((row) => row.budget);
  const totalLimit = withBudget.reduce((sum, row) => sum + (row.budget?.limit_amount ?? 0), 0);
  const totalSpent = withBudget.reduce((sum, row) => sum + row.usage.realized, 0);

  async function save(categoryId: string, value: string) {
    const limit = parseBRLInput(value);
    setEditing(null);
    if (!(limit > 0)) return;
    try {
      await createBudget.mutateAsync({ categoryId, yearMonth, limitAmount: limit });
    } catch (caught) {
      toast({ title: "Não foi possível salvar o limite", description: financeActionError(caught, ""), tone: "danger" });
    }
  }

  async function copyPrevious() {
    try {
      for (const budget of previousBudgets) {
        if (monthBudgets.some((item) => item.category_id === budget.category_id)) continue;
        await createBudget.mutateAsync({ categoryId: budget.category_id, yearMonth, limitAmount: budget.limit_amount });
      }
      toast({ title: "Orçamentos copiados", description: `De ${formatMonthLong(previousMonth)}`, tone: "success" });
    } catch {
      toast({ title: "Não foi possível copiar todos os limites", tone: "danger" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-fg-3">Orçado em {formatMonthLong(yearMonth).toLowerCase()}</p>
          <p className="font-display text-[22px] font-semibold tabular-nums text-fg">
            {formatBRL(totalSpent)} <span className="text-[15px] font-normal text-fg-4">de {formatBRL(totalLimit)}</span>
          </p>
          {totalLimit > 0 && <ProgressBar className="mt-2 max-w-md" value={(totalSpent / totalLimit) * 100} tone={budgetTone((totalSpent / totalLimit) * 100)} label="Uso total do orçamento" />}
        </div>
        {previousBudgets.length > 0 && monthBudgets.length < previousBudgets.length && (
          <Button size="sm" variant="secondary" leadingIcon={<CopyIcon size={14} />} onClick={() => void copyPrevious()} loading={createBudget.isPending}>
            Copiar de {formatMonthLong(previousMonth).split(" ")[0]?.toLowerCase()}
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : expenseCategories.length === 0 ? (
        <EmptyState icon={<StackIcon />} title="Crie categorias de despesa primeiro" description="Os orçamentos são definidos por categoria (ex.: Mercado, Lazer)." />
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map(({ category, budget, usage }) => {
            const limit = budget?.limit_amount ?? 0;
            const pct = limit > 0 ? (usage.realized / limit) * 100 : 0;
            const projectedPct = limit > 0 ? ((usage.realized + usage.committed) / limit) * 100 : 0;
            const isEditing = editing?.categoryId === category.id;
            return (
              <li key={category.id} className="flex flex-col gap-2 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: financeCategoryColor(category.id) }} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-fg">{category.name}</span>
                  {isEditing ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save(category.id, editing.value);
                      }}
                      className="flex items-center gap-1"
                    >
                      <input autoFocus value={editing.value} onChange={(event) => setEditing({ categoryId: category.id, value: event.target.value })} onBlur={() => void save(category.id, editing.value)} inputMode="decimal" placeholder="0,00" aria-label={`Limite para ${category.name}`} data-size="sm" className="q-input w-28 text-right tabular-nums" />
                    </form>
                  ) : budget ? (
                    <button type="button" onClick={() => setEditing({ categoryId: category.id, value: limit.toFixed(2).replace(".", ",") })} className="text-[13px] tabular-nums text-fg-2 hover:text-fg" title="Alterar limite">
                      {formatBRL(usage.realized)} <span className="text-fg-4">/ {formatBRL(limit)}</span>
                    </button>
                  ) : (
                    <>
                      {usage.realized > 0 && <span className="text-xs tabular-nums text-fg-4">{formatBRL(usage.realized)} gastos</span>}
                      <Button size="xs" variant="ghost" leadingIcon={<PlusIcon size={12} />} onClick={() => setEditing({ categoryId: category.id, value: "" })}>
                        Definir limite
                      </Button>
                    </>
                  )}
                  {budget && !isEditing && (
                    <IconButton size="xs" label={`Remover limite de ${category.name}`} onClick={() => deleteBudget.mutate(budget.id)}>
                      <XIcon />
                    </IconButton>
                  )}
                </div>
                {budget && (
                  <div className="flex items-center gap-3 pl-5">
                    <ProgressBar value={pct} tone={budgetTone(pct)} height={5} label={`Uso do limite de ${category.name}`} />
                    <span className={cx("w-24 shrink-0 text-right text-xs tabular-nums", pct >= 100 ? "text-danger" : pct >= 80 ? "text-warning" : "text-fg-3")}>
                      {pct >= 100 ? `${formatBRL(usage.realized - limit)} acima` : `${formatBRL(limit - usage.realized)} livres`}
                    </span>
                  </div>
                )}
                {budget && usage.committed > 0 && <p className="pl-5 text-2xs text-fg-4">+ {formatBRL(usage.committed)} previstos · {Math.round(projectedPct)}% do limite ao fim do mês</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────── Recorrências ─────────────────────────── */

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const MONTHS_BY_FREQUENCY: Record<RecurrenceFrequency, number> = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };

export function RecurringTransactionsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { recurringTransactions, isLoading } = useRecurringTransactions(client);
  const { categories } = useCategories(client);
  const { accounts } = useAccounts(client);
  const { cards } = useCards(client);
  const create = useCreateRecurringTransaction(client, userId);
  const updateStatus = useUpdateRecurringStatus(client);
  const generate = useGenerateOccurrence(client, userId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", type: "saida" as "saida" | "entrada", frequency: "mensal" as RecurrenceFrequency, startDate: formatLocalDate(new Date()), isSubscription: false, categoryId: "", source: "" });
  const [error, setError] = useState<string | null>(null);
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const active = recurringTransactions.filter((item) => item.status !== "cancelada");
  const monthlyCost = active.filter((item) => item.status === "ativa" && item.transaction_type === "saida").reduce((sum, item) => sum + item.amount / MONTHS_BY_FREQUENCY[item.frequency], 0);
  const subscriptions = active.filter((item) => item.is_subscription && item.status === "ativa");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = parseBRLInput(form.amount);
    if (!form.name.trim() || !(amount > 0)) return setError("Informe nome e valor.");
    const [kind, id] = form.source.split(":");
    try {
      await create.mutateAsync({
        name: form.name.trim(),
        amount,
        transactionType: form.type,
        frequency: form.frequency,
        startDate: form.startDate,
        isSubscription: form.isSubscription,
        categoryId: form.categoryId || undefined,
        accountId: kind === "account" ? id : undefined,
        cardId: kind === "card" ? id : undefined,
      });
      setOpen(false);
      toast({ title: "Recorrência criada", description: form.name.trim(), tone: "success" });
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível salvar."));
    }
  }

  function action(recurring: RecurringTransaction, run: () => Promise<unknown>, message: string) {
    void run()
      .then(() => toast({ title: message, description: recurring.name }))
      .catch(() => toast({ title: "Não foi possível concluir", tone: "danger" }));
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <RepeatIcon size={18} className="text-fg-4" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-fg">Recorrências e assinaturas</h3>
          <p className="text-xs text-fg-3">
            Custo fixo ≈ <span className="tabular-nums text-fg-2">{formatBRL(monthlyCost)}</span>/mês{subscriptions.length ? ` · ${subscriptions.length} assinaturas` : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<PlusIcon size={14} />}
          onClick={() => {
            setForm({ name: "", amount: "", type: "saida", frequency: "mensal", startDate: formatLocalDate(new Date()), isSubscription: false, categoryId: "", source: "" });
            setError(null);
            setOpen(true);
          }}
        >
          Nova
        </Button>
      </header>
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : active.length === 0 ? (
        <EmptyState size="sm" icon={<RepeatIcon />} title="Nenhuma recorrência" description="Aluguel, internet, streaming, salário — cadastre uma vez e acompanhe as próximas cobranças." />
      ) : (
        <ul className="divide-y divide-line-soft">
          {active.map((item) => (
            <li key={item.id} className={cx("flex items-center gap-3 px-4 py-3 sm:px-5", item.status === "pausada" && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[13.5px] font-medium text-fg">
                  {item.name}
                  {item.is_subscription && <Badge tone="gold">Assinatura</Badge>}
                  {item.status === "pausada" && <Badge>Pausada</Badge>}
                </p>
                <p className="truncate text-xs text-fg-4">
                  {FREQUENCY_LABEL[item.frequency]} · próxima {formatDayMonth(item.next_occurrence_date)}
                  {item.category_id ? ` · ${categoryById.get(item.category_id) ?? ""}` : ""}
                </p>
              </div>
              <span className={cx("text-[13.5px] font-semibold tabular-nums", item.transaction_type === "entrada" ? "text-success" : "text-fg")}>
                {item.transaction_type === "entrada" ? "+ " : "− "}
                {formatBRL(item.amount)}
              </span>
              <DropdownMenu
                label={`Ações para ${item.name}`}
                items={[
                  ...(item.status === "ativa" ? [{ label: "Lançar próxima agora", icon: <LightningIcon />, onSelect: () => action(item, () => generate.mutateAsync(item), "Lançamento criado") }] : []),
                  item.status === "ativa"
                    ? { label: "Pausar", icon: <PauseIcon />, onSelect: () => action(item, () => updateStatus.mutateAsync({ id: item.id, status: "pausada" }), "Recorrência pausada") }
                    : { label: "Retomar", icon: <PlayIcon />, onSelect: () => action(item, () => updateStatus.mutateAsync({ id: item.id, status: "ativa" }), "Recorrência retomada") },
                  "separator",
                  { label: "Encerrar", icon: <TrashIcon />, danger: true, onSelect: () => action(item, () => updateStatus.mutateAsync({ id: item.id, status: "cancelada" }), "Recorrência encerrada") },
                ]}
                trigger={(props) => (
                  <button type="button" {...props} aria-label={`Ações para ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-selected hover:text-fg">
                    <DotsThreeIcon size={18} weight="bold" />
                  </button>
                )}
              />
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nova recorrência" size="md" icon={<RepeatIcon />} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="recurring-form" loading={create.isPending}>Criar</Button></>}>
        <form id="recurring-form" onSubmit={submit} className="flex flex-col gap-4">
          <Segmented label="Tipo" fullWidth value={form.type} onChange={(type) => setForm({ ...form, type, categoryId: "" })} options={[{ value: "saida", label: "Despesa" }, { value: "entrada", label: "Receita" }]} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
            <Input label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Internet" maxLength={120} autoFocus data-autofocus />
            <Input label="Valor" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" placeholder="0,00" className="tabular-nums" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Frequência" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as RecurrenceFrequency })}>
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input label="Primeira cobrança" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            <Select label="Categoria" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              <option value="">Sem categoria</option>
              {categories.filter((category) => category.kind === form.type).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select label={form.type === "entrada" ? "Entra em" : "Pago com"} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
              <option value="">Não informar</option>
              {accounts.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  {account.name}
                </option>
              ))}
              {form.type === "saida" && cards.map((card) => (
                <option key={card.id} value={`card:${card.id}`}>
                  Cartão · {card.nickname}
                </option>
              ))}
            </Select>
          </div>
          {form.type === "saida" && <Checkbox label="É uma assinatura" description="Streaming, apps, clubes — destacadas para você revisar o que ainda usa." checked={form.isSubscription} onChange={(event) => setForm({ ...form, isSubscription: event.target.checked })} />}
          {error && <Notice compact>{error}</Notice>}
        </form>
      </Modal>
    </section>
  );
}

/* ─────────────────────────── Parcelamentos ─────────────────────────── */

export function InstallmentsPanel({ client, userId, transactions }: { client: SupabaseClient<Database>; userId: string; transactions: Transaction[] }) {
  const { toast } = useToast();
  const { installments, isLoading } = useInstallments(client);
  const create = useCreateInstallmentPurchase(client, userId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", total: "", count: "3", first: formatLocalDate(new Date()) });
  const [error, setError] = useState<string | null>(null);
  const today = formatLocalDate(new Date());

  async function submit(event: FormEvent) {
    event.preventDefault();
    const total = parseBRLInput(form.total);
    const count = Number(form.count);
    if (!form.name.trim() || !(total > 0) || !Number.isInteger(count) || count < 2 || count > 120) return setError("Informe nome, valor total e de 2 a 120 parcelas.");
    try {
      await create.mutateAsync({ name: form.name.trim(), totalAmount: total, installmentCount: count, firstInstallmentDate: form.first });
      setOpen(false);
      toast({ title: "Parcelamento criado", description: `${count}x de ${formatBRL(total / count)}`, tone: "success" });
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível criar as parcelas."));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <StackIcon size={18} className="text-fg-4" />
        <h3 className="flex-1 text-[14px] font-semibold text-fg">Parcelamentos</h3>
        <Button size="sm" variant="secondary" leadingIcon={<PlusIcon size={14} />} onClick={() => { setForm({ name: "", total: "", count: "3", first: today }); setError(null); setOpen(true); }}>
          Novo
        </Button>
      </header>
      {isLoading ? (
        <SkeletonList rows={2} />
      ) : installments.length === 0 ? (
        <EmptyState size="sm" icon={<StackIcon />} title="Nenhuma compra parcelada" description="Cada parcela vira um lançamento agendado no mês certo." />
      ) : (
        <ul className="divide-y divide-line-soft">
          {installments.map((installment) => {
            const parts = transactions.filter((transaction) => transaction.installment_id === installment.id);
            const paid = parts.filter((transaction) => transaction.status === "concluida" || transaction.date <= today).length;
            return (
              <li key={installment.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">{installment.name}</p>
                  <p className="text-xs text-fg-4">
                    {installment.installment_count}x de {formatBRL(installment.total_amount / installment.installment_count)} · desde {formatDayMonth(installment.first_installment_date)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={(paid / installment.installment_count) * 100} height={4} className="max-w-[180px]" label="Parcelas pagas" />
                    <span className="text-2xs tabular-nums text-fg-4">{paid}/{installment.installment_count}</span>
                  </div>
                </div>
                <span className="text-[13.5px] font-semibold tabular-nums text-fg">{formatBRL(installment.total_amount)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nova compra parcelada" size="sm" icon={<StackIcon />} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="installment-form" loading={create.isPending}>Criar parcelas</Button></>}>
        <form id="installment-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Input label="O que foi comprado" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Notebook" maxLength={120} wrapperClassName="col-span-2" autoFocus data-autofocus />
          <Input label="Valor total" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} inputMode="decimal" placeholder="0,00" />
          <Input label="Parcelas" type="number" min={2} max={120} value={form.count} onChange={(event) => setForm({ ...form, count: event.target.value })} />
          <Input label="1ª parcela" type="date" value={form.first} onChange={(event) => setForm({ ...form, first: event.target.value })} wrapperClassName="col-span-2" />
          {parseBRLInput(form.total) > 0 && Number(form.count) >= 2 && <p className="col-span-2 text-xs text-fg-3">{form.count}x de {formatBRL(parseBRLInput(form.total) / Number(form.count))}</p>}
          {error && <Notice compact className="col-span-2">{error}</Notice>}
        </form>
      </Modal>
    </section>
  );
}

/* ─────────────────────────── Calendário financeiro ─────────────────────────── */

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function FinancialCalendar({ transactions, recurringTransactions }: { transactions: Transaction[]; recurringTransactions: RecurringTransaction[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => formatLocalDate(new Date()));
  const monthKey = formatLocalDate(month).slice(0, 7);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const projected = useMemo(() => projectRecurringOccurrences(recurringTransactions, `${monthKey}-01`, `${monthKey}-${String(daysInMonth).padStart(2, "0")}`), [recurringTransactions, monthKey, daysInMonth]);
  const byDay = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; planned: number }>();
    for (const transaction of transactions) {
      if (!transaction.date.startsWith(monthKey) || transaction.status === "cancelada" || transaction.transaction_type === "transferencia") continue;
      const entry = map.get(transaction.date) ?? { income: 0, expense: 0, planned: 0 };
      if (transaction.status !== "concluida") entry.planned += transaction.amount;
      else if (transaction.transaction_type === "entrada") entry.income += transaction.amount;
      else entry.expense += transaction.amount;
      map.set(transaction.date, entry);
    }
    const represented = new Set(transactions.filter((t) => t.recurring_transaction_id).map((t) => `${t.recurring_transaction_id}:${t.date}`));
    for (const occurrence of projected) {
      if (represented.has(`${occurrence.recurringId}:${occurrence.date}`)) continue;
      const entry = map.get(occurrence.date) ?? { income: 0, expense: 0, planned: 0 };
      entry.planned += occurrence.amount;
      map.set(occurrence.date, entry);
    }
    return map;
  }, [transactions, projected, monthKey]);
  const leading = month.getDay();
  const today = formatLocalDate(new Date());
  const dayItems = [
    ...transactions.filter((transaction) => transaction.date === selected && transaction.status !== "cancelada").map((transaction) => ({ key: transaction.id, name: transaction.name, amount: transaction.amount, income: transaction.transaction_type === "entrada", planned: transaction.status !== "concluida" })),
    ...projected.filter((occurrence) => occurrence.date === selected && !transactions.some((t) => t.recurring_transaction_id === occurrence.recurringId && t.date === occurrence.date)).map((occurrence) => ({ key: `${occurrence.recurringId}:${occurrence.date}`, name: occurrence.name, amount: occurrence.amount, income: occurrence.transaction_type === "entrada", planned: true })),
  ];

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <CalendarBlankIcon size={18} className="text-fg-4" />
        <h3 className="flex-1 text-[14px] font-semibold text-fg">{formatMonthLong(monthKey)}</h3>
        <IconButton size="sm" label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <CaretLeftIcon />
        </IconButton>
        <IconButton size="sm" label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <CaretRightIcon />
        </IconButton>
      </header>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="pb-1 text-2xs text-fg-4">
            {day}
          </span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
          const entry = byDay.get(key);
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={isSelected}
              aria-label={`Dia ${index + 1}`}
              className={cx("flex h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs tabular-nums transition-colors", isSelected ? "bg-selected text-fg" : key === today ? "text-gold-fg hover:bg-hover" : "text-fg-2 hover:bg-hover")}
            >
              {index + 1}
              <span className="flex h-1.5 gap-0.5">
                {entry?.expense ? <span className="h-1.5 w-1.5 rounded-full bg-fg-3" /> : null}
                {entry?.income ? <span className="h-1.5 w-1.5 rounded-full bg-success" /> : null}
                {entry?.planned ? <span className="h-1.5 w-1.5 rounded-full border border-warning" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-2xs text-fg-4">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-fg-3" /> Despesa</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Receita</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full border border-warning" /> Prevista</span>
      </div>
      <div className="mt-3 border-t border-line-soft pt-3">
        <p className="mb-1.5 text-xs font-medium text-fg-2">{formatDayMonth(selected)}</p>
        {dayItems.length === 0 ? (
          <p className="text-xs text-fg-4">Nada neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {dayItems.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-[13px]">
                <span className={cx("min-w-0 flex-1 truncate", item.planned ? "text-fg-3" : "text-fg")}>
                  {item.name}
                  {item.planned && <span className="text-fg-4"> · prevista</span>}
                </span>
                <span className={cx("tabular-nums", item.income ? "text-success" : "text-fg-2")}>{item.income ? "+" : "−"} {formatBRL(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
