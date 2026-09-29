import { useMemo, useState } from "react";
import { ChatsCircleIcon, DotsThreeIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { ConfirmDialog, DropdownMenu, SkeletonList, cx, useToast } from "@qqorvex/ui";
import { useDeleteVexConversation, useRenameVexConversation, useVexConversations, type VexConversation } from "@qqorvex/vex";
import { supabase } from "../app/supabase";
import { groupConversations } from "./helpers";

/** Histórico de conversas: busca por título, agrupado por data, renomear e apagar. */
export function VexHistory({ activeId, onSelect, onDeleted, className }: { activeId: string | null; onSelect: (id: string) => void; onDeleted: (id: string) => void; className?: string }) {
  const { toast } = useToast();
  const conversations = useVexConversations(supabase);
  const rename = useRenameVexConversation(supabase);
  const remove = useDeleteVexConversation(supabase);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<VexConversation | null>(null);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = (conversations.data ?? []).filter((conversation) => !term || conversation.title.toLowerCase().includes(term));
    return groupConversations(list);
  }, [conversations.data, query]);

  function commitRename(conversation: VexConversation) {
    const title = draft.trim();
    setRenamingId(null);
    if (!title || title === conversation.title) return;
    rename.mutate({ conversationId: conversation.id, title }, { onError: () => toast({ title: "Não foi possível renomear", tone: "danger" }) });
  }

  const total = conversations.data?.length ?? 0;

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      {total > 4 && (
        <div className="relative mb-2 px-1">
          <MagnifyingGlassIcon size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conversas" aria-label="Buscar conversas" data-size="sm" className="q-input pl-8!" />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {conversations.isLoading ? (
          <SkeletonList rows={5} subtitle={false} meta={false} className="px-2 py-2" />
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <ChatsCircleIcon size={24} className="text-fg-4" />
            <p className="text-[13px] text-fg-3">Suas conversas com a Vex aparecem aqui.</p>
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-fg-3">Nenhuma conversa com “{query}”.</p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-3">
              <h3 className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-fg-4">{group.label}</h3>
              <ul className="flex flex-col gap-px">
                {group.items.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li key={conversation.id} className={cx("group relative flex items-center rounded-lg transition-colors", active ? "bg-selected" : "hover:bg-hover")}>
                      {renamingId === conversation.id ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onBlur={() => commitRename(conversation)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitRename(conversation);
                            if (event.key === "Escape") setRenamingId(null);
                          }}
                          aria-label="Novo nome da conversa"
                          data-size="sm"
                          className="q-input m-0.5"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelect(conversation.id)}
                            aria-current={active ? "true" : undefined}
                            className={cx("min-w-0 flex-1 truncate px-2.5 py-2 text-left text-[13px]", active ? "font-medium text-fg" : "text-fg-2")}
                          >
                            {conversation.title}
                          </button>
                          <DropdownMenu
                            label={`Ações para ${conversation.title}`}
                            items={[
                              {
                                label: "Renomear",
                                icon: <PencilSimpleIcon />,
                                onSelect: () => {
                                  setDraft(conversation.title);
                                  setRenamingId(conversation.id);
                                },
                              },
                              { label: "Apagar", icon: <TrashIcon />, danger: true, onSelect: () => setDeleting(conversation) },
                            ]}
                            trigger={(props) => (
                              <button
                                type="button"
                                {...props}
                                aria-label={`Ações para ${conversation.title}`}
                                className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-4 hover:bg-selected hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
                              >
                                <DotsThreeIcon size={16} weight="bold" />
                              </button>
                            )}
                          />
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      <ConfirmDialog
        isOpen={deleting !== null}
        title="Apagar conversa?"
        description={deleting ? `“${deleting.title}” e todas as mensagens serão apagadas. Isso não afeta tarefas, eventos ou notas criadas pela Vex.` : undefined}
        confirmLabel="Apagar"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (!target) return;
          remove.mutate(target.id, {
            onSuccess: () => onDeleted(target.id),
            onError: () => toast({ title: "Não foi possível apagar a conversa", tone: "danger" }),
          });
        }}
      />
    </div>
  );
}
