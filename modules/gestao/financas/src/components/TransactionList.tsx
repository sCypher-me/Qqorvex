import { useState, type ReactNode } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { Badge, Button, ConfirmDialog, EmptyState, type BadgeTone } from "@qqorvex/ui";
import { PAYMENT_METHOD_LABELS } from "../service";
import type { Account, Card, Category, Transaction } from "../types";

const STATUS_LABEL: Record<Transaction["status"], string> = {
  concluida: "Concluída",
  futura: "Futura",
  pendente: "Pendente",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<Transaction["status"], BadgeTone> = {
  concluida: "success",
  futura: "info",
  pendente: "warning",
  vencida: "error",
  cancelada: "warning",
};

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Paleta fechada de categorias do Design System (categorias de Finanças não têm cor própria no banco). */
const CATEGORY_PALETTE = [
  "var(--color-category-amber)",
  "var(--color-category-blue)",
  "var(--color-category-green)",
  "var(--color-category-magenta)",
  "var(--color-category-coral)",
  "var(--color-category-lavender)",
  "var(--color-category-teal)",
  "var(--color-category-bronze)",
  "var(--color-category-bluegray)",
];

/** Cor estável de uma categoria, derivada da paleta a partir do id. Sem categoria = cinza neutro. */
export function financeCategoryColor(categoryId: string | null | undefined): string {
  if (!categoryId) return "var(--color-text-muted)";
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length] ?? "var(--color-text-muted)";
}

/** Valor monetário pt-BR: "R$ 1.234,56". */
export function formatBRL(value: number): string {
  return `R$ ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "+ R$ 920,00" / "− R$ 312,44" (sinal de menos tipográfico). */
export function formatSignedBRL(value: number, sign: "+" | "-" | ""): string {
  return sign === "" ? formatBRL(value) : `${sign === "+" ? "+" : "−"} ${formatBRL(value)}`;
}

/** "15 set" a partir de `YYYY-MM-DD`. */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day} ${MONTHS_SHORT[Number(month) - 1] ?? ""}`;
}

/** Converte "1.234,56" / "1234.56" / "312,44" em número. */
export function parseBRLInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  return Number(normalized);
}

export function TransactionList({
  client,
  transactions,
  onDelete,
  categories = [],
  accounts = [],
  cards = [],
  title = "Transações",
  meta,
}: {
  client: SupabaseClient<Database>;
  transactions: Transaction[];
  onDelete: (id: string) => void;
  /** Opcionais: usados só para nomear categoria/conta/cartão na linha. */
  categories?: Category[];
  accounts?: Account[];
  cards?: Card[];
  title?: ReactNode;
  meta?: ReactNode;
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="qv-card overflow-hidden">
      <div className="flex items-center gap-[10px] px-[18px] py-4 border-b border-border">
        <span className="text-base font-semibold">{title}</span>
        <span className="font-mono text-xs text-text-muted">
          {meta ?? `${transactions.length} ${transactions.length === 1 ? "lançamento" : "lançamentos"}`}
        </span>
      </div>
      {transactions.length === 0 ? (
        <EmptyState className="px-[18px] py-4">
          Nenhuma movimentação ainda. Use a barra de lançamento acima para registrar a primeira.
        </EmptyState>
      ) : (
        transactions.map((t) => (
          <TransactionRow
            key={t.id}
            client={client}
            transaction={t}
            categoryName={t.category_id ? categoryById.get(t.category_id)?.name : undefined}
            accountName={
              t.card_id
                ? cardById.get(t.card_id)?.nickname
                : t.account_id
                  ? accountById.get(t.account_id)?.name
                  : undefined
            }
            transferToName={t.transfer_to_account_id ? accountById.get(t.transfer_to_account_id)?.name : undefined}
            onDelete={() => onDelete(t.id)}
          />
        ))
      )}
    </div>
  );
}

function TransactionRow({
  client,
  transaction: t,
  categoryName,
  accountName,
  transferToName,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  transaction: Transaction;
  categoryName?: string;
  accountName?: string;
  transferToName?: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isTransfer = t.transaction_type === "transferencia";
  const isEntrada = t.transaction_type === "entrada";
  const sign = isTransfer ? "" : isEntrada ? "+" : "-";
  const amountColor = isTransfer ? "text-text-secondary" : isEntrada ? "text-success" : "text-error";

  const meta = [
    isTransfer ? "Transferência" : categoryName ?? "Sem categoria",
    isTransfer && accountName && transferToName ? `${accountName} → ${transferToName}` : accountName,
    t.payment_method && !t.card_id ? PAYMENT_METHOD_LABELS[t.payment_method] : null,
    t.installment_number ? `parcela ${t.installment_number}` : null,
    formatDayMonth(t.date),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`qv-row ${expanded ? "bg-white/[.02]" : ""}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={expanded ? "Ocultar detalhes" : "Comprovante e ações"}
        className="w-full text-left flex items-center gap-[14px] px-[18px] py-[13px] cursor-pointer hover:bg-white/[.02]"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isTransfer ? "var(--color-category-bluegray)" : financeCategoryColor(t.category_id) }}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-sm font-medium truncate text-text-primary">{t.name}</span>
          <span className="text-xs text-text-muted truncate">{meta}</span>
        </div>
        {t.status !== "concluida" && <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>}
        <span
          className={`font-mono text-sm font-medium whitespace-nowrap ${amountColor} ${
            t.status === "cancelada" ? "line-through opacity-60" : ""
          }`}
        >
          {formatSignedBRL(t.amount, sign)}
        </span>
      </button>
      {expanded && (
        <div className="px-[18px] pb-4 flex flex-col gap-3">
          <AttachDocumentPanel client={client} relatedModule="financas" relatedEntityId={t.id} />
          <Button type="button" variant="destructive" size="sm" className="self-end" onClick={() => setConfirmOpen(true)}>
            Excluir transação
          </Button>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${t.name}"?`}
        description="Essa ação não pode ser desfeita. Saldos, orçamentos e o calendário financeiro são recalculados sem ela."
        confirmLabel="Excluir transação"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
