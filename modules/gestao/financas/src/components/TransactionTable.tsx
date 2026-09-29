import { useState } from "react";
import { ArrowsLeftRightIcon, CheckCircleIcon, CopyIcon, DotsThreeIcon, PaperclipIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { Badge, ConfirmDialog, DropdownMenu, Modal, cx, type BadgeTone } from "@qqorvex/ui";
import { financeCategoryColor, formatBRL } from "../format";
import type { Account, Card, Category, Transaction } from "../types";

const STATUS: Record<Transaction["status"], { label: string; tone: BadgeTone }> = {
  concluida: { label: "Concluída", tone: "success" },
  futura: { label: "Agendada", tone: "info" },
  pendente: { label: "Pendente", tone: "warning" },
  vencida: { label: "Vencida", tone: "danger" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

function dayHeader(isoDate: string): string {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  const label = date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface TransactionTableProps {
  client: SupabaseClient<Database>;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onMarkDone: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => Promise<unknown>;
}

/** Lista de lançamentos agrupada por dia, com o total líquido de cada dia. */
export function TransactionTable({ client, transactions, categories, accounts, cards, onEdit, onDuplicate, onMarkDone, onDelete }: TransactionTableProps) {
  const [confirm, setConfirm] = useState<Transaction | null>(null);
  const [attachFor, setAttachFor] = useState<Transaction | null>(null);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const cardById = new Map(cards.map((card) => [card.id, card]));

  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
  const dates = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="overflow-clip rounded-xl border border-line bg-surface">
      {dates.map((date) => {
        const items = groups.get(date)!;
        const net = items.reduce((sum, t) => (t.status === "cancelada" || t.transaction_type === "transferencia" ? sum : sum + (t.transaction_type === "entrada" ? t.amount : -t.amount)), 0);
        return (
          <section key={date} className="border-t border-line first:border-t-0">
            <header className="sticky top-14 z-[1] flex items-center justify-between border-b border-line-soft bg-raised/95 px-4 py-2 backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-fg-2">{dayHeader(date)}</h3>
              <span className={cx("text-xs tabular-nums", net < 0 ? "text-fg-3" : "text-success")}>{net === 0 ? "" : `${net > 0 ? "+" : "−"} ${formatBRL(net)}`}</span>
            </header>
            <ul className="divide-y divide-line-soft">
              {items.map((transaction) => {
                const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
                const origin = transaction.card_id ? cardById.get(transaction.card_id)?.nickname : transaction.account_id ? accountById.get(transaction.account_id)?.name : undefined;
                const destination = transaction.transfer_to_account_id ? accountById.get(transaction.transfer_to_account_id)?.name : undefined;
                const isIncome = transaction.transaction_type === "entrada";
                const isTransfer = transaction.transaction_type === "transferencia";
                const cancelled = transaction.status === "cancelada";
                return (
                  <li key={transaction.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold"
                      style={{ background: isTransfer ? "var(--q-hover)" : `color-mix(in srgb, ${financeCategoryColor(transaction.category_id)} 16%, transparent)`, color: isTransfer ? "var(--q-fg-3)" : financeCategoryColor(transaction.category_id) }}
                    >
                      {isTransfer ? <ArrowsLeftRightIcon size={15} /> : (category?.name ?? "•").charAt(0).toUpperCase()}
                    </span>
                    <button type="button" onClick={() => onEdit(transaction)} className="min-w-0 flex-1 text-left">
                      <span className={cx("block truncate text-[13.5px]", cancelled ? "text-fg-4 line-through" : "text-fg")}>{transaction.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-fg-4">
                        {[isTransfer ? `${origin ?? "?"} → ${destination ?? "?"}` : category?.name ?? "Sem categoria", !isTransfer ? origin : null, transaction.tags.length ? transaction.tags.map((tag) => `#${tag}`).join(" ") : null].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                    {transaction.status !== "concluida" && <Badge tone={STATUS[transaction.status].tone}>{STATUS[transaction.status].label}</Badge>}
                    <span className={cx("shrink-0 text-right text-[13.5px] font-medium tabular-nums", cancelled ? "text-fg-4 line-through" : isTransfer ? "text-fg-3" : isIncome ? "text-success" : "text-fg")}>
                      {isTransfer ? "" : isIncome ? "+ " : "− "}
                      {formatBRL(transaction.amount)}
                    </span>
                    <DropdownMenu
                      label={`Ações para ${transaction.name}`}
                      items={[
                        ...(transaction.status !== "concluida" && transaction.status !== "cancelada" ? [{ label: isIncome ? "Marcar como recebida" : "Marcar como paga", icon: <CheckCircleIcon />, onSelect: () => onMarkDone(transaction) }] : []),
                        { label: "Editar", icon: <PencilSimpleIcon />, onSelect: () => onEdit(transaction) },
                        { label: "Duplicar", icon: <CopyIcon />, onSelect: () => onDuplicate(transaction) },
                        { label: "Comprovantes", icon: <PaperclipIcon />, onSelect: () => setAttachFor(transaction) },
                        "separator",
                        { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setConfirm(transaction) },
                      ]}
                      trigger={(props) => (
                        <button type="button" {...props} aria-label={`Ações para ${transaction.name}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-4 hover:bg-selected hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100">
                          <DotsThreeIcon size={18} weight="bold" />
                        </button>
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <ConfirmDialog
        isOpen={confirm !== null}
        title="Excluir lançamento?"
        description={confirm ? `“${confirm.name}” (${formatBRL(confirm.amount)}) será removido e os saldos serão recalculados.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target) void onDelete(target);
        }}
      />
      <Modal isOpen={attachFor !== null} onClose={() => setAttachFor(null)} title="Comprovantes" description={attachFor?.name} size="md" icon={<PaperclipIcon />}>
        {attachFor && <AttachDocumentPanel client={client} relatedModule="financas" relatedEntityId={attachFor.id} />}
      </Modal>
    </div>
  );
}
