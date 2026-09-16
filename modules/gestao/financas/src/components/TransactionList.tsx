import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { Card, Badge, Button, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { PAYMENT_METHOD_LABELS } from "../service";
import type { Transaction } from "../types";

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

export function TransactionList({
  client,
  transactions,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  transactions: Transaction[];
  onDelete: (id: string) => void;
}) {
  if (transactions.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Nenhuma movimentação ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((t) => (
        <TransactionRow key={t.id} client={client} transaction={t} onDelete={() => onDelete(t.id)} />
      ))}
    </div>
  );
}

function TransactionRow({
  client,
  transaction: t,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  transaction: Transaction;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isEntrada = t.transaction_type === "entrada";
  const sign = t.transaction_type === "transferencia" ? "" : isEntrada ? "+" : "-";
  const colorClass =
    t.transaction_type === "transferencia" ? "text-text-secondary-warm" : isEntrada ? "text-success" : "text-error";

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-sm text-text-primary">{t.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
            <span className="font-sans text-xs text-text-secondary-warm">
              {t.date}
              {t.payment_method && ` · ${PAYMENT_METHOD_LABELS[t.payment_method]}`}
              {t.installment_number && ` · ${t.installment_number}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm ${colorClass}`}>
            {sign}R$ {t.amount.toFixed(2)}
          </span>
          <Button type="button" variant="chip" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ocultar" : "Comprovante"}
          </Button>
          <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
            Excluir
          </Button>
        </div>
      </div>
      {expanded && <AttachDocumentPanel client={client} relatedModule="financas" relatedEntityId={t.id} />}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${t.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
