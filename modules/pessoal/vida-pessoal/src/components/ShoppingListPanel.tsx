import { useState, type FormEvent } from "react";
import { CaretDownIcon, ShoppingCartIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Checkbox, SkeletonList, cx } from "@qqorvex/ui";
import { useCreateShoppingListItem, useDeleteShoppingListItem, useShoppingListItems, useToggleShoppingListItem } from "../hooks/useVidaPratica";
import type { ShoppingListItem } from "../types";
import { PanelEmpty, PanelRow, PanelShell } from "./PanelShell";

/** Lista de mercado/dia a dia — adicionar é sempre visível; comprados descem para um grupo recolhível. */
export function ShoppingListPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { items, isLoading } = useShoppingListItems(client);
  const createItem = useCreateShoppingListItem(client, userId);
  const toggleItem = useToggleShoppingListItem(client);
  const deleteItem = useDeleteShoppingListItem(client);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showPurchased, setShowPurchased] = useState(false);
  const pending = items.filter((item) => !item.is_purchased);
  const purchased = items.filter((item) => item.is_purchased);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createItem.mutate(
      { name: trimmed, quantity: quantity.trim() || undefined },
      {
        onSuccess: () => {
          setName("");
          setQuantity("");
        },
      },
    );
  }

  const row = (item: ShoppingListItem) => (
    <PanelRow key={item.id} onDelete={() => deleteItem.mutate(item.id)} deleteLabel={`Excluir "${item.name}"`}>
      <Checkbox
        round
        checked={item.is_purchased}
        onChange={(event) => toggleItem.mutate({ itemId: item.id, isPurchased: event.target.checked })}
        aria-label={item.is_purchased ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
      />
      <span className={cx("min-w-0 flex-1 truncate text-[13.5px]", item.is_purchased ? "text-fg-3 line-through" : "text-fg")}>{item.name}</span>
      {item.quantity && <span className="shrink-0 text-xs text-fg-3">{item.quantity}</span>}
    </PanelRow>
  );

  return (
    <PanelShell icon={<ShoppingCartIcon />} title="Lista de compras" meta={isLoading ? undefined : pending.length ? `${pending.length} pendentes` : undefined}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Adicionar item…" aria-label="Item" data-size="sm" className="q-input min-w-0 flex-1" />
        <input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qtd." aria-label="Quantidade" data-size="sm" className="q-input w-20 shrink-0" />
        <Button type="submit" size="sm" variant="secondary" disabled={!name.trim() || createItem.isPending}>
          Adicionar
        </Button>
      </form>
      {createItem.isError && <p className="px-4 pt-2 text-xs text-danger" role="alert">Não foi possível adicionar; o texto continua no campo.</p>}

      {isLoading ? (
        <SkeletonList rows={3} subtitle={false} />
      ) : items.length === 0 ? (
        <PanelEmpty>Lista vazia. Anote o que falta em casa e marque no mercado.</PanelEmpty>
      ) : (
        <>
          {pending.length === 0 ? <PanelEmpty>Tudo comprado.</PanelEmpty> : <ul className="divide-y divide-line-soft">{pending.map(row)}</ul>}
          {purchased.length > 0 && (
            <div className="border-t border-line-soft">
              <div className="flex items-center gap-2 px-4 py-2">
                <button type="button" onClick={() => setShowPurchased((value) => !value)} aria-expanded={showPurchased} className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium text-fg-3 hover:text-fg">
                  <CaretDownIcon size={12} className={cx("transition-transform", !showPurchased && "-rotate-90")} />
                  Comprados ({purchased.length})
                </button>
                <Button size="xs" variant="ghost" onClick={() => purchased.forEach((item) => deleteItem.mutate(item.id))}>
                  Limpar comprados
                </Button>
              </div>
              {showPurchased && <ul className="divide-y divide-line-soft">{purchased.map(row)}</ul>}
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}
