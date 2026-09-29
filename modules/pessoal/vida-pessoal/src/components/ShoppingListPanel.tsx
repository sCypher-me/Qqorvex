import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, EmptyState, Input, ProgressBar, SkeletonList } from "@qqorvex/ui";
import { useCreateShoppingListItem, useDeleteShoppingListItem, useShoppingListItems, useToggleShoppingListItem } from "../hooks/useVidaPratica";

/** Lista de mercado/dia a dia — item + quantidade em texto livre + marcar como comprado. */
export function ShoppingListPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { items, isLoading } = useShoppingListItems(client);
  const createItem = useCreateShoppingListItem(client, userId);
  const toggleItem = useToggleShoppingListItem(client);
  const deleteItem = useDeleteShoppingListItem(client);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmItem = items.find((i) => i.id === confirmDeleteId) ?? null;
  const purchasedCount = items.filter((item) => item.is_purchased).length;
  const pendingCount = items.length - purchasedCount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createItem.mutate({ name, quantity: String(form.get("quantity") ?? "").trim() || undefined }, { onSuccess: () => formElement.reset() });
  }

  return (
    <section className="qv-card p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-text-primary">Lista de compras</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{items.length}</span>}
      </div>

      {isLoading ? (
        <SkeletonList rows={2} subtitle={false} className="py-2" />
      ) : items.length === 0 ? (
        <EmptyState>Lista de compras vazia.</EmptyState>
      ) : (
        <>
        <div className="qv-well flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="text-text-secondary">{purchasedCount} de {items.length} itens comprados</span><span className="font-mono text-text-muted">{pendingCount} pendentes</span></div>
          <ProgressBar value={items.length ? (purchasedCount / items.length) * 100 : 0} height={4} />
        </div>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="qv-row-top flex items-center gap-2.5 py-2">
              <label className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="qv-check"
                  checked={item.is_purchased}
                  onChange={(e) => toggleItem.mutate({ itemId: item.id, isPurchased: e.target.checked })}
                />
                <span className={`text-[13px] ${item.is_purchased ? "line-through text-text-muted" : "text-text-primary"}`}>
                  {item.name}
                </span>
              </label>
              <span className="font-mono text-xs text-text-secondary">{item.quantity || "—"}</span>
              <button
                type="button"
                className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
                aria-label={`Excluir "${item.name}"`}
                title="Excluir"
                onClick={() => setConfirmDeleteId(item.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        </>
      )}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="qv-row-top pt-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <Input name="name" placeholder="Item" aria-label="Item" className="py-2 text-[13px]" autoFocus />
            <Input name="quantity" placeholder="Qtd. (ex.: 2kg)" aria-label="Quantidade" className="py-2 text-[13px] font-mono" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={createItem.isPending}>
              {createItem.isPending ? "Salvando…" : "Adicionar"}
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
      {createItem.isError && <p className="text-xs text-error" role="alert">Não foi possível adicionar o item; os campos continuam preenchidos.</p>}

      <ConfirmDialog
        isOpen={confirmItem !== null}
        title={`Excluir "${confirmItem?.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmItem) deleteItem.mutate(confirmItem.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}
