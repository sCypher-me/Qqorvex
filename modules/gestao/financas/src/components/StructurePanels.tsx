import { useState, type FormEvent } from "react";
import { BankIcon, CreditCardIcon, DotsThreeIcon, PencilSimpleIcon, PlusIcon, TagIcon, TrashIcon, WalletIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, ConfirmDialog, DropdownMenu, EmptyState, Input, Modal, Notice, Select, SkeletonList, cx, useToast } from "@qqorvex/ui";
import {
  useAccounts,
  useCardStatements,
  useCards,
  useCategories,
  useCreateAccount,
  useCreateCard,
  useCreateCategory,
  useDeleteAccount,
  useDeleteCard,
  useDeleteCategory,
  useEnsureCurrentStatement,
  useMarkStatementPaid,
  useTransactions,
  useTransactionsForCardInPeriod,
  useUpdateAccount,
  useUpdateCard,
  useUpdateCardClosingConfig,
  useUpdateCategory,
} from "../hooks/useFinancas";
import { computeAccountBalance, computeStatementDueDate, computeStatementPeriod, computeStatementTotal, formatLocalDate, toReferenceMonth } from "../service";
import { financeActionError } from "../financeErrors";
import { financeCategoryColor, formatBRL, formatDayMonth } from "../format";
import type { Account, Card, Category, CategoryKind } from "../types";

const ACCOUNT_TYPE_LABEL: Record<Account["account_type"], string> = {
  conta_bancaria: "Conta bancária",
  carteira_digital: "Carteira digital",
  dinheiro: "Dinheiro",
  outro: "Outra",
};

function ItemMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu
      label={`Ações para ${label}`}
      items={[
        { label: "Editar", icon: <PencilSimpleIcon />, onSelect: onEdit },
        { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
      ]}
      trigger={(props) => (
        <button type="button" {...props} aria-label={`Ações para ${label}`} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-selected hover:text-fg">
          <DotsThreeIcon size={18} weight="bold" />
        </button>
      )}
    />
  );
}

/* ─────────────────────────── Contas ─────────────────────────── */

export function AccountsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { accounts, isLoading } = useAccounts(client);
  const { transactions } = useTransactions(client);
  const createAccount = useCreateAccount(client, userId);
  const updateAccount = useUpdateAccount(client);
  const deleteAccount = useDeleteAccount(client);
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [confirm, setConfirm] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["account_type"]>("conta_bancaria");
  const [error, setError] = useState<string | null>(null);
  const total = accounts.reduce((sum, account) => sum + computeAccountBalance(transactions, account.id), 0);

  function open(target: Account | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setType(target === "new" ? "conta_bancaria" : target.account_type);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Dê um nome para a conta.");
    try {
      if (editing === "new") await createAccount.mutateAsync({ name: name.trim(), accountType: type });
      else if (editing) await updateAccount.mutateAsync({ id: editing.id, name: name.trim(), accountType: type });
      setEditing(null);
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível salvar a conta."));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <BankIcon size={18} className="text-fg-4" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold text-fg">Contas</h3>
          <p className="text-xs text-fg-3">Saldo somado: <span className={cx("tabular-nums", total < 0 ? "text-danger" : "text-fg-2")}>{total < 0 ? "− " : ""}{formatBRL(total)}</span></p>
        </div>
        <Button size="sm" variant="secondary" leadingIcon={<PlusIcon size={14} />} onClick={() => open("new")}>
          Nova conta
        </Button>
      </header>
      {isLoading ? (
        <SkeletonList rows={3} leading />
      ) : accounts.length === 0 ? (
        <EmptyState size="sm" icon={<WalletIcon />} title="Nenhuma conta ainda" description="Cadastre banco, carteira digital ou dinheiro em espécie para acompanhar saldos." />
      ) : (
        <ul className="divide-y divide-line-soft">
          {accounts.map((account) => {
            const balance = computeAccountBalance(transactions, account.id);
            return (
              <li key={account.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hover text-[13px] font-semibold text-fg-2">{account.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">{account.name}</p>
                  <p className="text-xs text-fg-4">{ACCOUNT_TYPE_LABEL[account.account_type]}</p>
                </div>
                <span className={cx("text-[14px] font-semibold tabular-nums", balance < 0 ? "text-danger" : "text-fg")}>{balance < 0 ? "− " : ""}{formatBRL(balance)}</span>
                <ItemMenu label={account.name} onEdit={() => open(account)} onDelete={() => setConfirm(account)} />
              </li>
            );
          })}
        </ul>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nova conta" : "Editar conta"} size="sm" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" form="account-form" loading={createAccount.isPending || updateAccount.isPending}>Salvar</Button></>}>
        <form id="account-form" onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Nubank" maxLength={80} autoFocus data-autofocus />
          <Select label="Tipo" value={type} onChange={(event) => setType(event.target.value as Account["account_type"])}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {error && <Notice compact>{error}</Notice>}
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={confirm !== null}
        title="Excluir conta?"
        description={`“${confirm?.name}” será removida. Os lançamentos continuam, apenas sem conta vinculada.`}
        confirmLabel="Excluir conta"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) deleteAccount.mutate(target.id, { onSuccess: () => toast({ title: "Conta excluída", description: target.name }) });
        }}
      />
    </section>
  );
}

/* ─────────────────────────── Cartões ─────────────────────────── */

function CardStatement({ client, userId, card }: { client: SupabaseClient<Database>; userId: string; card: Card }) {
  const { toast } = useToast();
  const hasConfig = card.closing_day !== null && card.due_day !== null;
  const now = new Date();
  const { periodStart, periodEnd } = computeStatementPeriod(card.closing_day ?? 1, now);
  const startIso = formatLocalDate(periodStart);
  const endIso = formatLocalDate(periodEnd);
  const { transactions } = useTransactionsForCardInPeriod(client, card.id, startIso, endIso, hasConfig);
  const { statements } = useCardStatements(client, card.id);
  const ensure = useEnsureCurrentStatement(client, userId);
  const markPaid = useMarkStatementPaid(client, card.id);
  if (!hasConfig) return <p className="text-xs text-fg-4">Configure os dias de fechamento e vencimento para acompanhar a fatura.</p>;
  const total = computeStatementTotal(transactions);
  const due = computeStatementDueDate(periodEnd, card.due_day ?? 1);
  const current = statements.find((statement) => statement.reference_month === toReferenceMonth(periodEnd));
  const isClosed = now >= periodEnd;
  const isPaid = current?.status === "paga";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-soft bg-canvas/50 p-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-fg-3">Fatura atual · {formatDayMonth(startIso)} a {formatDayMonth(endIso)}</p>
          <p className="font-display text-[20px] font-semibold tabular-nums text-fg">{formatBRL(total)}</p>
          <p className="text-xs text-fg-4">Vence em {due.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</p>
        </div>
        {isPaid ? (
          <Badge tone="success">Paga</Badge>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            disabled={!isClosed}
            loading={ensure.isPending || markPaid.isPending}
            onClick={async () => {
              try {
                const statement = current ?? (await ensure.mutateAsync({ card, referenceDate: now }));
                await markPaid.mutateAsync(statement.id);
                toast({ title: "Fatura marcada como paga", tone: "success" });
              } catch {
                toast({ title: "Não foi possível atualizar a fatura", tone: "danger" });
              }
            }}
          >
            {isClosed ? "Marcar como paga" : "Fatura aberta"}
          </Button>
        )}
      </div>
      {transactions.length > 0 && (
        <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto text-xs">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-center gap-2">
              <span className="w-12 shrink-0 tabular-nums text-fg-4">{formatDayMonth(transaction.date)}</span>
              <span className="min-w-0 flex-1 truncate text-fg-2">{transaction.name}</span>
              <span className="tabular-nums text-fg">{formatBRL(transaction.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {statements.filter((statement) => statement.status === "paga").length > 0 && (
        <p className="text-2xs text-fg-4">Faturas pagas: {statements.filter((statement) => statement.status === "paga").map((statement) => statement.reference_month.split("-").reverse().join("/")).join(" · ")}</p>
      )}
    </div>
  );
}

export function CardsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { cards, isLoading } = useCards(client);
  const createCard = useCreateCard(client, userId);
  const updateCard = useUpdateCard(client);
  const updateClosing = useUpdateCardClosingConfig(client);
  const deleteCard = useDeleteCard(client);
  const [editing, setEditing] = useState<Card | "new" | null>(null);
  const [confirm, setConfirm] = useState<Card | null>(null);
  const [form, setForm] = useState({ nickname: "", institution: "", lastDigits: "", closingDay: "", dueDay: "" });
  const [error, setError] = useState<string | null>(null);

  function open(target: Card | "new") {
    setEditing(target);
    setForm(
      target === "new"
        ? { nickname: "", institution: "", lastDigits: "", closingDay: "", dueDay: "" }
        : { nickname: target.nickname, institution: target.institution ?? "", lastDigits: target.last_digits ?? "", closingDay: target.closing_day ? String(target.closing_day) : "", dueDay: target.due_day ? String(target.due_day) : "" },
    );
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const closingDay = form.closingDay ? Number(form.closingDay) : undefined;
    const dueDay = form.dueDay ? Number(form.dueDay) : undefined;
    if (!form.nickname.trim()) return setError("Dê um apelido para o cartão.");
    if (Boolean(closingDay) !== Boolean(dueDay)) return setError("Informe fechamento e vencimento juntos, ou deixe os dois vazios.");
    if ((closingDay && (closingDay < 1 || closingDay > 31)) || (dueDay && (dueDay < 1 || dueDay > 31))) return setError("Use dias entre 1 e 31.");
    try {
      if (editing === "new") {
        const card = await createCard.mutateAsync({ nickname: form.nickname.trim(), closingDay, dueDay });
        if (form.institution || form.lastDigits) await updateCard.mutateAsync({ id: card.id, institution: form.institution.trim() || null, lastDigits: form.lastDigits.trim() || null });
      } else if (editing) {
        await updateCard.mutateAsync({ id: editing.id, nickname: form.nickname.trim(), institution: form.institution.trim() || null, lastDigits: form.lastDigits.trim() || null });
        if (closingDay && dueDay && (closingDay !== editing.closing_day || dueDay !== editing.due_day)) await updateClosing.mutateAsync({ cardId: editing.id, closingDay, dueDay });
      }
      setEditing(null);
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível salvar o cartão."));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <CreditCardIcon size={18} className="text-fg-4" />
        <h3 className="flex-1 text-[14px] font-semibold text-fg">Cartões de crédito</h3>
        <Button size="sm" variant="secondary" leadingIcon={<PlusIcon size={14} />} onClick={() => open("new")}>
          Novo cartão
        </Button>
      </header>
      {isLoading ? (
        <SkeletonList rows={2} leading />
      ) : cards.length === 0 ? (
        <EmptyState size="sm" icon={<CreditCardIcon />} title="Nenhum cartão" description="Com o fechamento e vencimento configurados, a fatura é calculada automaticamente." />
      ) : (
        <ul className="divide-y divide-line-soft">
          {cards.map((card) => (
            <li key={card.id} className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-12 shrink-0 items-end justify-end rounded-md bg-gradient-to-br from-gold/80 to-gold-press/70 p-1 text-[9px] font-semibold tabular-nums text-on-gold">{card.last_digits ? `•${card.last_digits}` : ""}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">{card.nickname}</p>
                  <p className="text-xs text-fg-4">{[card.institution, card.closing_day ? `fecha dia ${card.closing_day}` : null, card.due_day ? `vence dia ${card.due_day}` : null].filter(Boolean).join(" · ") || "Sem fechamento configurado"}</p>
                </div>
                <ItemMenu label={card.nickname} onEdit={() => open(card)} onDelete={() => setConfirm(card)} />
              </div>
              <CardStatement client={client} userId={userId} card={card} />
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo cartão" : "Editar cartão"} size="sm" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" form="card-form" loading={createCard.isPending || updateCard.isPending}>Salvar</Button></>}>
        <form id="card-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Input label="Apelido" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="Ex.: Nubank roxinho" maxLength={60} wrapperClassName="col-span-2" autoFocus data-autofocus />
          <Input label="Banco" value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} placeholder="Opcional" maxLength={60} />
          <Input label="Final" value={form.lastDigits} onChange={(event) => setForm({ ...form, lastDigits: event.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" inputMode="numeric" />
          <Input label="Dia do fechamento" type="number" min={1} max={31} value={form.closingDay} onChange={(event) => setForm({ ...form, closingDay: event.target.value })} />
          <Input label="Dia do vencimento" type="number" min={1} max={31} value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} />
          {error && <Notice compact className="col-span-2">{error}</Notice>}
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={confirm !== null}
        title="Excluir cartão?"
        description={`“${confirm?.nickname}” será removido. Compras já lançadas continuam, sem cartão vinculado.`}
        confirmLabel="Excluir cartão"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) deleteCard.mutate(target.id, { onSuccess: () => toast({ title: "Cartão excluído", description: target.nickname }) });
        }}
      />
    </section>
  );
}

/* ─────────────────────────── Categorias ─────────────────────────── */

export function CategoriesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { categories, isLoading } = useCategories(client);
  const createCategory = useCreateCategory(client, userId);
  const updateCategory = useUpdateCategory(client);
  const deleteCategory = useDeleteCategory(client);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<CategoryKind>("saida");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    try {
      await createCategory.mutateAsync({ name: draft.trim(), kind });
      setDraft("");
      setError(null);
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível criar a categoria."));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <TagIcon size={18} className="text-fg-4" />
        <h3 className="flex-1 text-[14px] font-semibold text-fg">Categorias</h3>
      </header>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-b border-line-soft px-4 py-3 sm:px-5">
        <Input label="Nova categoria" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ex.: Pets" maxLength={60} wrapperClassName="min-w-[180px] flex-1" fieldSize="sm" />
        <Select label="Tipo" value={kind} onChange={(event) => setKind(event.target.value as CategoryKind)} fieldSize="sm">
          <option value="saida">Despesa</option>
          <option value="entrada">Receita</option>
        </Select>
        <Button type="submit" size="sm" loading={createCategory.isPending} disabled={!draft.trim()}>
          Adicionar
        </Button>
        {error && <Notice compact className="w-full">{error}</Notice>}
      </form>
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : categories.length === 0 ? (
        <EmptyState size="sm" icon={<TagIcon />} title="Sem categorias" description="Categorias organizam gastos e permitem orçamentos por tipo de despesa." />
      ) : (
        <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-5">
          {(["saida", "entrada"] as CategoryKind[]).map((group) => (
            <div key={group}>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-4">{group === "saida" ? "Despesas" : "Receitas"}</p>
              <ul className="flex flex-col">
                {categories
                  .filter((category) => category.kind === group)
                  .map((category) => (
                    <li key={category.id} className="group flex h-9 items-center gap-2.5 rounded-md px-1 hover:bg-hover">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: financeCategoryColor(category.id) }} />
                      {renaming?.id === category.id ? (
                        <form
                          className="flex-1"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (renaming.name.trim()) updateCategory.mutate({ id: category.id, name: renaming.name });
                            setRenaming(null);
                          }}
                        >
                          <input autoFocus value={renaming.name} onChange={(event) => setRenaming({ id: category.id, name: event.target.value })} onBlur={() => setRenaming(null)} aria-label="Novo nome" className="h-7 w-full rounded-md border border-gold-line bg-field px-2 text-[13px] outline-none" />
                        </form>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{category.name}</span>
                      )}
                      <span className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" aria-label={`Renomear ${category.name}`} onClick={() => setRenaming({ id: category.id, name: category.name })} className="rounded p-1 text-fg-4 hover:text-fg">
                          <PencilSimpleIcon size={14} />
                        </button>
                        <button type="button" aria-label={`Excluir ${category.name}`} onClick={() => setConfirm(category)} className="rounded p-1 text-fg-4 hover:text-danger">
                          <TrashIcon size={14} />
                        </button>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={confirm !== null}
        title="Excluir categoria?"
        description={`“${confirm?.name}” será removida. Lançamentos ficam sem categoria e o orçamento dela é apagado.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) deleteCategory.mutate(target.id, { onSuccess: () => toast({ title: "Categoria excluída", description: target.name }) });
        }}
      />
    </section>
  );
}
