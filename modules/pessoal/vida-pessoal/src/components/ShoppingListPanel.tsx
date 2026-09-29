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
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Lista de compras</h2>
        {!isLoading && <span className="font-mono text-xs text-fg-3">{items.length}</span>}
      </div>

      {isLoading ? (
        <SkeletonList rows={2} subtitle={false} className="py-2" />
      ) : items.length === 0 ? (
        <EmptyState>Lista de compras vazia.</EmptyState>
      ) : (
        <>
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="text-fg-2">{purchasedCount} de {items.length} itens comprados</span><span className="font-mono text-fg-3">{pendingCount} pendentes</span></div>
          <ProgressBar value={items.length ? (purchasedCount / items.length) * 100 : 0} height={4} />
        </div>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="border-t border-line-soft flex items-center gap-2.5 py-2">
              <label className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[var(--q-gold)]"
                  checked={item.is_purchased}
                  onChange={(e) => toggleItem.mutate({ itemId: item.id, isPurchased: e.target.checked })}
                />
                <span className={`text-[13px] ${item.is_purchased ? "line-through text-fg-3" : "text-fg"}`}>
                  {item.name}
                </span>
              </label>
              <span className="font-mono text-xs text-fg-2">{item.quantity || "—"}</span>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 w-6 h-6 text-[11px] shrink-0"
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
        <form onSubmit={handleSubmit} className="border-t border-line-soft pt-3 flex flex-col gap-2.5">
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
      {createItem.isError && <p className="text-xs text-danger" role="alert">Não foi possível adicionar o item; os campos continuam preenchidos.</p>}

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
