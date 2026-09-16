import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog } from "@qqorvex/ui";
import { useCreateShoppingListItem, useDeleteShoppingListItem, useShoppingListItems, useToggleShoppingListItem } from "../hooks/useVidaPratica";

/** Lista de mercado/dia a dia — item + quantidade em texto livre + marcar como comprado. */
export function ShoppingListPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { items, isLoading } = useShoppingListItems(client);
  const createItem = useCreateShoppingListItem(client, userId);
  const toggleItem = useToggleShoppingListItem(client);
  const deleteItem = useDeleteShoppingListItem(client);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmItem = items.find((i) => i.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createItem.mutate({ name, quantity: String(form.get("quantity") ?? "").trim() || undefined });
    event.currentTarget.reset();
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input name="name" placeholder="Item" className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="quantity" placeholder="Qtd. (ex.: 2kg)" className="w-28 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Lista de compras vazia.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={item.is_purchased}
                  onChange={(e) => toggleItem.mutate({ itemId: item.id, isPurchased: e.target.checked })}
                />
                <span className={`text-text-primary ${item.is_purchased ? "line-through text-text-secondary-warm" : ""}`}>
                  {item.name} {item.quantity && `(${item.quantity})`}
                </span>
              </label>
              <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(item.id)}>
                Excluir
              </Button>
            </li>
          ))}
        </ul>
      )}
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
    </div>
  );
}
