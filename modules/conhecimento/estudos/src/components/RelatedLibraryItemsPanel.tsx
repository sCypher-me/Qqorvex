import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useLibraryItems } from "@qqorvex/module-biblioteca";
import { useRelatedLibraryItems, useRelateLibraryItem, useUnrelateLibraryItem } from "../hooks/useEstudosIntegrations";

/**
 * "Ação Estudar ou Usar em um Caderno relaciona Item de Biblioteca a Caderno existente ou novo.
 * Biblioteca continua dona do item." Relação/desrelação nunca afeta o item na Biblioteca.
 */
export function RelatedLibraryItemsPanel({
  client,
  notebookId,
}: {
  client: SupabaseClient<Database>;
  notebookId: string;
}) {
  const { items: allItems } = useLibraryItems(client);
  const { libraryItems: related, isLoading } = useRelatedLibraryItems(client, notebookId);
  const relate = useRelateLibraryItem(client, notebookId);
  const unrelate = useUnrelateLibraryItem(client, notebookId);
  const [selectedId, setSelectedId] = useState("");

  const relatedIds = new Set(related.map((i) => i.id));
  const relatableItems = allItems.filter((i) => !relatedIds.has(i.id));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-sm font-semibold text-text-secondary-warm">Itens da Biblioteca usados neste Caderno</h3>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : related.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum item relacionado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {related.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm text-text-primary">
              <span>{item.title}</span>
              <Button type="button" variant="chip" onClick={() => unrelate.mutate(item.id)}>
                Remover relação
              </Button>
            </li>
          ))}
        </ul>
      )}

      {relatableItems.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Usar um item da Biblioteca...</option>
            {relatableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!selectedId) return;
              relate.mutate(selectedId);
              setSelectedId("");
            }}
          >
            Relacionar
          </Button>
        </div>
      )}
    </div>
  );
}
