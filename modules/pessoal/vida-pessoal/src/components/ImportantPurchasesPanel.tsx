import { useState, type FormEvent } from "react";
import { CaretDownIcon, SealCheckIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Checkbox, ConfirmDialog, Input, Select, SkeletonList, cx } from "@qqorvex/ui";
import { useCreateImportantPurchase, useDeleteImportantPurchase, useImportantPurchases, useToggleImportantPurchase, useUpdateImportantPurchase } from "../hooks/useVidaPratica";
import type { ImportantPurchase, PurchasePriority } from "../types";
import { PanelEditingNote, PanelEmpty, PanelRow, PanelShell, brl } from "./PanelShell";

const PRIORITY_LABELS: Record<PurchasePriority, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const PRIORITY_DOT: Record<PurchasePriority, string> = { alta: "bg-danger", media: "bg-warning", baixa: "bg-fg-4" };
const PRIORITY_ORDER: Record<PurchasePriority, number> = { alta: 0, media: 1, baixa: 2 };

/** "Quero comprar" de itens caros/planejados — ordenado por prioridade, com o total previsto no topo. */
export function ImportantPurchasesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { purchases, isLoading } = useImportantPurchases(client);
  const createPurchase = useCreateImportantPurchase(client, userId);
  const togglePurchase = useToggleImportantPurchase(client);
  const updatePurchase = useUpdateImportantPurchase(client);
  const deletePurchase = useDeleteImportantPurchase(client);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ImportantPurchase | null>(null);
  const saving = editing ? updatePurchase : createPurchase;
  const [showBought, setShowBought] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmPurchase = purchases.find((p) => p.id === confirmDeleteId) ?? null;
  const pending = purchases.filter((purchase) => !purchase.is_purchased).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const bought = purchases.filter((purchase) => purchase.is_purchased);
  const plannedTotal = pending.reduce((sum, purchase) => sum + (purchase.estimated_price ?? 0), 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const input = {
      title,
      estimatedPrice: form.get("estimatedPrice") ? Number(form.get("estimatedPrice")) : undefined,
      priority: (form.get("priority") as PurchasePriority) || "media",
    };
    if (editing) {
      updatePurchase.mutate({ purchaseId: editing.id, input }, { onSuccess: () => setEditing(null) });
      return;
    }
    createPurchase.mutate(input, {
      onSuccess: () => {
        formElement.reset();
        setFormOpen(false);
      },
    });
  }

  const form = (
    <form key={editing?.id ?? "novo"} onSubmit={handleSubmit} className="flex flex-col gap-2">
      {editing && <PanelEditingNote name={editing.title} onCancel={() => setEditing(null)} />}
      <Input name="title" defaultValue={editing?.title} placeholder="O que você quer comprar?" aria-label="Item" fieldSize="sm" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <Input name="estimatedPrice" type="number" min={0} step="0.01" defaultValue={editing?.estimated_price ?? ""} placeholder="Preço estimado (R$)" aria-label="Preço estimado" fieldSize="sm" />
        <Select name="priority" defaultValue={editing?.priority ?? "media"} aria-label="Prioridade" fieldSize="sm">
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              Prioridade {label.toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" className="self-start" loading={saving.isPending}>
        {editing ? "Salvar alterações" : "Salvar compra"}
      </Button>
      {saving.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar a compra; os campos continuam preenchidos.</p>}
    </form>
  );

  const row = (purchase: ImportantPurchase) => (
    <PanelRow
      key={purchase.id}
      onEdit={() => {
        setFormOpen(false);
        setEditing(purchase);
      }}
      editLabel={`Editar "${purchase.title}"`}
      onDelete={() => setConfirmDeleteId(purchase.id)}
      deleteLabel={`Excluir "${purchase.title}"`}
    >
      <Checkbox
        round
        checked={purchase.is_purchased}
        onChange={(event) => togglePurchase.mutate({ purchaseId: purchase.id, isPurchased: event.target.checked })}
        aria-label={purchase.is_purchased ? `Desmarcar ${purchase.title}` : `Marcar ${purchase.title} como comprado`}
      />
      <span className="min-w-0 flex-1">
        <span className={cx("block truncate text-[13.5px]", purchase.is_purchased ? "text-fg-3 line-through" : "font-medium text-fg")}>{purchase.title}</span>
        {!purchase.is_purchased && (
          <span className="flex items-center gap-1.5 text-xs text-fg-3">
            <span className={cx("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[purchase.priority])} aria-hidden="true" />
            Prioridade {PRIORITY_LABELS[purchase.priority].toLowerCase()}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[13px] tabular-nums text-fg-2">{purchase.estimated_price ? brl.format(purchase.estimated_price) : "—"}</span>
    </PanelRow>
  );

  return (
    <PanelShell
      icon={<SealCheckIcon />}
      title="Compras planejadas"
      meta={isLoading ? undefined : pending.length || undefined}
      summary={pending.length && plannedTotal ? `${brl.format(plannedTotal)} previstos` : "Itens maiores que você quer comprar"}
      addLabel="Adicionar compra"
      formOpen={formOpen || editing !== null}
      onToggleForm={() => (editing ? setEditing(null) : setFormOpen((value) => !value))}
      form={form}
    >
      {isLoading ? (
        <SkeletonList rows={2} leading />
      ) : purchases.length === 0 ? (
        <PanelEmpty>Anote as compras maiores — cadeira, celular, viagem — com preço e prioridade.</PanelEmpty>
      ) : (
        <>
          {pending.length === 0 ? <PanelEmpty>Nada pendente. Tudo comprado.</PanelEmpty> : <ul className="divide-y divide-line-soft">{pending.map(row)}</ul>}
          {bought.length > 0 && (
            <div className="border-t border-line-soft">
              <button type="button" onClick={() => setShowBought((value) => !value)} aria-expanded={showBought} className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-xs font-medium text-fg-3 hover:text-fg">
                <CaretDownIcon size={12} className={cx("transition-transform", !showBought && "-rotate-90")} />
                Compradas ({bought.length})
              </button>
              {showBought && <ul className="divide-y divide-line-soft">{bought.map(row)}</ul>}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmPurchase !== null}
        title={`Excluir "${confirmPurchase?.title}"?`}
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmPurchase) deletePurchase.mutate(confirmPurchase.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </PanelShell>
  );
}
