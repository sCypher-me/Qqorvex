import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, EmptyState, Input, Select, type BadgeTone } from "@qqorvex/ui";
import { useCreateImportantPurchase, useDeleteImportantPurchase, useImportantPurchases, useToggleImportantPurchase } from "../hooks/useVidaPratica";
import type { PurchasePriority } from "../types";

const PRIORITY_LABELS: Record<PurchasePriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORITY_TONE: Record<PurchasePriority, BadgeTone> = { baixa: "info", media: "warning", alta: "error" };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "Quero comprar" de itens caros/planejados — sem vínculo com Finanças na v1 (YAGNI consciente). */
export function ImportantPurchasesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { purchases, isLoading } = useImportantPurchases(client);
  const createPurchase = useCreateImportantPurchase(client, userId);
  const togglePurchase = useToggleImportantPurchase(client);
  const deletePurchase = useDeleteImportantPurchase(client);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmPurchase = purchases.find((p) => p.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    createPurchase.mutate({
      title,
      estimatedPrice: form.get("estimatedPrice") ? Number(form.get("estimatedPrice")) : undefined,
      priority: (form.get("priority") as PurchasePriority) || "media",
    });
    event.currentTarget.reset();
  }

  return (
    <section className="qv-card p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-text-primary">Compras importantes</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{purchases.length}</span>}
      </div>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : purchases.length === 0 ? (
        <EmptyState>Nenhuma compra planejada.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="qv-row-top flex items-center gap-2.5 py-2">
              <label className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="qv-check"
                  checked={purchase.is_purchased}
                  onChange={(e) => togglePurchase.mutate({ purchaseId: purchase.id, isPurchased: e.target.checked })}
                />
                <span className="flex flex-col items-start gap-1 min-w-0">
                  <span
                    className={`text-[13px] ${purchase.is_purchased ? "line-through text-text-muted" : "text-text-primary"}`}
                  >
                    {purchase.title}
                  </span>
                  <Badge tone={PRIORITY_TONE[purchase.priority]}>{PRIORITY_LABELS[purchase.priority]}</Badge>
                </span>
              </label>
              <span className="font-mono text-xs text-text-secondary">
                {purchase.estimated_price ? brl.format(purchase.estimated_price) : "—"}
              </span>
              <button
                type="button"
                className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
                aria-label={`Excluir "${purchase.title}"`}
                title="Excluir"
                onClick={() => setConfirmDeleteId(purchase.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="qv-row-top pt-3 flex flex-col gap-2.5">
          <Input name="title" placeholder="O que você quer comprar?" aria-label="Item" className="py-2 text-[13px]" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="estimatedPrice"
              type="number"
              placeholder="Preço estimado"
              aria-label="Preço estimado"
              className="py-2 text-[13px] font-mono"
            />
            <Select name="priority" defaultValue="media" aria-label="Prioridade" className="py-2 text-[13px]">
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">
              Adicionar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Fechar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="dashed" className="w-full" onClick={() => setFormOpen(true)}>
          Adicionar
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmPurchase !== null}
        title={`Excluir "${confirmPurchase?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmPurchase) deletePurchase.mutate(confirmPurchase.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}
