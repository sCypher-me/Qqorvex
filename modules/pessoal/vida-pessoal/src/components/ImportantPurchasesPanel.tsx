import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Card, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useCreateImportantPurchase, useDeleteImportantPurchase, useImportantPurchases, useToggleImportantPurchase } from "../hooks/useVidaPratica";
import type { PurchasePriority } from "../types";

const PRIORITY_LABELS: Record<PurchasePriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORITY_TONE: Record<PurchasePriority, BadgeTone> = { baixa: "info", media: "warning", alta: "error" };

/** "Quero comprar" de itens caros/planejados — sem vínculo com Finanças na v1 (YAGNI consciente). */
export function ImportantPurchasesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { purchases, isLoading } = useImportantPurchases(client);
  const createPurchase = useCreateImportantPurchase(client, userId);
  const togglePurchase = useToggleImportantPurchase(client);
  const deletePurchase = useDeleteImportantPurchase(client);
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
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input name="title" placeholder="O que você quer comprar?" className="flex-1 min-w-[160px] rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="estimatedPrice" type="number" placeholder="Preço estimado" className="w-32 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <select name="priority" defaultValue="media" className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm">
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : purchases.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma compra planejada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={purchase.is_purchased}
                      onChange={(e) => togglePurchase.mutate({ purchaseId: purchase.id, isPurchased: e.target.checked })}
                    />
                    <div className="flex flex-col gap-1">
                      <p className={`font-sans text-sm text-text-primary ${purchase.is_purchased ? "line-through" : ""}`}>{purchase.title}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={PRIORITY_TONE[purchase.priority]}>{PRIORITY_LABELS[purchase.priority]}</Badge>
                        {purchase.estimated_price && (
                          <span className="font-sans text-xs text-text-secondary-warm">R$ {purchase.estimated_price}</span>
                        )}
                      </div>
                    </div>
                  </label>
                  <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(purchase.id)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
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
    </div>
  );
}
