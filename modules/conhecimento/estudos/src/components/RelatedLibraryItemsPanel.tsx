import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState } from "@qqorvex/ui";
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
    <div className="flex flex-col gap-3">
      <CardHeader title="Itens da Biblioteca" meta={isLoading ? undefined : related.length} />

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : related.length === 0 ? (
        <EmptyState>Nenhum item da Biblioteca usado neste caderno.</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {related.map((item) => (
            <li key={item.id} className="qv-row flex items-center justify-between gap-3 py-2.5 text-sm text-text-primary">
              <span className="min-w-0 truncate">{item.title}</span>
              <Button type="button" variant="quiet" size="xs" onClick={() => unrelate.mutate(item.id)}>
                Remover relação
              </Button>
            </li>
          ))}
        </ul>
      )}

      {relatableItems.length > 0 && (
        <div className="flex gap-2.5">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Item da Biblioteca"
            className="qv-field flex-1 py-2 text-[13px]"
          >
            <option value="">Usar um item da Biblioteca...</option>
            {relatableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!selectedId}
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
