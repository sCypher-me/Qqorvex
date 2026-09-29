import { useState } from "react";
import { Link } from "react-router-dom";
import { BooksIcon, LinkBreakIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState, IconButton, SkeletonList } from "@qqorvex/ui";
import { LIBRARY_ITEM_TYPE_LABELS, useLibraryItems } from "@qqorvex/module-biblioteca";
import { useRelatedLibraryItems, useRelateLibraryItem, useUnrelateLibraryItem } from "../hooks/useEstudosIntegrations";

/**
 * Livros, cursos e outros itens da Biblioteca usados neste caderno. A Biblioteca continua dona do
 * item: relacionar ou remover a relação nunca altera o item.
 */
export function RelatedLibraryItemsPanel({ client, notebookId }: { client: SupabaseClient<Database>; notebookId: string }) {
  const { items: allItems } = useLibraryItems(client);
  const { libraryItems: related, isLoading } = useRelatedLibraryItems(client, notebookId);
  const relate = useRelateLibraryItem(client, notebookId);
  const unrelate = useUnrelateLibraryItem(client, notebookId);
  const [selectedId, setSelectedId] = useState("");

  const relatedIds = new Set(related.map((item) => item.id));
  const relatable = allItems.filter((item) => !relatedIds.has(item.id) && !item.is_archived);

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <BooksIcon size={17} className="text-fg-3" />
        <h3 className="text-[14px] font-semibold text-fg">Da Biblioteca</h3>
        {!isLoading && <span className="text-xs text-fg-4">{related.length}</span>}
      </header>
      <div className="p-4">
        {isLoading ? (
          <SkeletonList rows={2} subtitle={false} className="py-2" />
        ) : related.length === 0 ? (
          <EmptyState size="sm" title="Nenhum material ligado" description="Relacione livros, cursos ou vídeos da sua Biblioteca que você usa neste caderno." />
        ) : (
          <ul className="flex flex-col gap-2">
            {related.map((item) => (
              <li key={item.id} className="group flex items-center gap-3 rounded-lg px-1 py-1">
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="h-12 w-9 shrink-0 rounded object-cover ring-1 ring-line" loading="lazy" />
                ) : (
                  <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-hover text-fg-4">
                    <BooksIcon size={16} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link to={`/conhecimento/biblioteca?item=${item.id}`} className="block truncate text-[13.5px] font-medium text-fg hover:underline">
                    {item.title}
                  </Link>
                  <p className="truncate text-xs text-fg-3">{[LIBRARY_ITEM_TYPE_LABELS[item.item_type], item.subtitle, item.year].filter(Boolean).join(" · ")}</p>
                </div>
                <IconButton label={`Remover ${item.title} deste caderno`} size="sm" onClick={() => unrelate.mutate(item.id)} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                  <LinkBreakIcon />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        {relatable.length > 0 && (
          <div className="mt-4 flex gap-2 border-t border-line-soft pt-4">
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Item da Biblioteca" data-size="sm" className="q-input min-w-0 flex-1">
              <option value="">Ligar um item da Biblioteca…</option>
              {relatable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedId}
              loading={relate.isPending}
              onClick={() => {
                if (!selectedId) return;
                relate.mutate(selectedId, { onSuccess: () => setSelectedId("") });
              }}
            >
              Ligar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
