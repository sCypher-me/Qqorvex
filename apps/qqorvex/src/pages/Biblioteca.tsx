import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArchiveIcon, ArrowCounterClockwiseIcon, ArrowSquareOutIcon, BooksIcon, GraduationCapIcon, ListIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, SparkleIcon, SquaresFourIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import {
  EditItemForm,
  ItemProgressForm,
  ItemReviewForm,
  LIBRARY_ITEM_TYPE_LABELS,
  LibraryCard,
  LibraryCover,
  LibraryRow,
  NewItemForm,
  STATUS_META,
  computeProgressPercent,
  progressText,
  useArchiveLibraryItem,
  useArchivedLibraryItems,
  useCreateLibraryItemWithCreators,
  useDeleteLibraryItem,
  useItemCreators,
  useLibraryItems,
  useToggleFavorite,
  useUpdateItemReview,
  useUpdateItemStatus,
  useUpdateLibraryItem,
  useUpdateProgress,
  type LibraryItem,
  type LibraryItemStatus,
  type LibraryItemType,
} from "@qqorvex/module-biblioteca";
import { relateLibraryItem, useNotebooks } from "@qqorvex/module-estudos";
import { Button, ConfirmDialog, EmptyState, IconButton, Modal, Notice, PageContainer, PageHeader, ProgressBar, Segmented, Sheet, Skeleton, Tabs, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";
import { useVexLauncher } from "../vex/VexLauncher";

type StatusTab = "todos" | LibraryItemStatus | "favoritos" | "arquivados";
type Sort = "recentes" | "titulo" | "avaliacao" | "ano";

const TYPE_PLURAL: Record<LibraryItemType, string> = {
  book: "Livros",
  comic: "Quadrinhos",
  manga: "Mangás",
  movie: "Filmes",
  series: "Séries",
  anime: "Animes",
  podcast: "Podcasts",
  podcast_episode: "Episódios de podcast",
  video: "Vídeos",
  article: "Artigos",
  web_content: "Conteúdos web",
  course: "Cursos",
  academic_paper: "Artigos acadêmicos",
  game: "Jogos",
  other: "Outros",
};

function readViewPreference(): "grade" | "lista" {
  try {
    return window.localStorage.getItem("qqorvex.biblioteca.view") === "lista" ? "lista" : "grade";
  } catch {
    return "grade";
  }
}

/** Card da faixa "Continuar": capa, progresso e +1 (página, episódio, aula). */
function ContinueCard({ item, onOpen, onStep, busy }: { item: LibraryItem; onOpen: () => void; onStep: () => void; busy: boolean }) {
  const percent = computeProgressPercent(item);
  const text = progressText(item);
  const canStep = percent !== null && percent < 100;
  return (
    <div className="flex w-[280px] shrink-0 items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <button type="button" onClick={onOpen} className="w-12 shrink-0" aria-label={`Abrir ${item.title}`}>
        <LibraryCover item={item} showTitle={false} className="w-full rounded-md" />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block w-full truncate text-left text-[13.5px] font-medium text-fg hover:underline">
          {item.title}
        </button>
        <p className="truncate text-xs text-fg-3">{text ?? "Sem progresso registrado"}</p>
        {percent !== null && <ProgressBar value={percent} height={4} className="mt-2" label={`Progresso de ${item.title}`} />}
      </div>
      {canStep ? (
        <IconButton label={`Avançar ${item.progress_unit ? `1 ${item.progress_unit.replace(/s$/, "")}` : "progresso"} em ${item.title}`} variant="secondary" onClick={onStep} disabled={busy}>
          <PlusIcon weight="bold" />
        </IconButton>
      ) : (
        <Button size="xs" variant="ghost" onClick={onOpen}>
          Registrar
        </Button>
      )}
    </div>
  );
}

export function BibliotecaPage() {
  const { userId } = useAccount();
  usePageMeta({ title: "Biblioteca" });
  const { toast } = useToast();
  const openVex = useVexLauncher();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState<StatusTab>("todos");
  const [type, setType] = useState<LibraryItemType | "">("");
  const [sort, setSort] = useState<Sort>("recentes");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grade" | "lista">(readViewPreference);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LibraryItem | null>(null);
  const [editing, setEditing] = useState<LibraryItem | null>(null);

  const { items, isLoading, error } = useLibraryItems(supabase);
  const { items: archived, isLoading: archivedLoading } = useArchivedLibraryItems(supabase, tab === "arquivados" || Boolean(params.get("item")));
  const { notebooks } = useNotebooks(supabase);
  const createItem = useCreateLibraryItemWithCreators(supabase, userId ?? "");
  const updateStatus = useUpdateItemStatus(supabase);
  const updateProgress = useUpdateProgress(supabase);
  const updateReview = useUpdateItemReview(supabase);
  const toggleFavorite = useToggleFavorite(supabase);
  const archiveItem = useArchiveLibraryItem(supabase);
  const deleteItem = useDeleteLibraryItem(supabase);
  const updateItem = useUpdateLibraryItem(supabase, userId ?? "");
  const { creators: editingCreators, isLoading: creatorsLoading } = useItemCreators(supabase, editing?.id ?? "", editing !== null);

  const selectedId = params.get("item");
  const selected = selectedId ? [...items, ...archived].find((item) => item.id === selectedId) ?? null : null;
  const openItem = (id: string | null) =>
    setParams((current) => {
      const copy = new URLSearchParams(current);
      if (id) copy.set("item", id);
      else copy.delete("item");
      return copy;
    });

  useEffect(() => {
    try {
      window.localStorage.setItem("qqorvex.biblioteca.view", view);
    } catch {
      /* preferência opcional */
    }
  }, [view]);

  const counts = useMemo(() => {
    const by = (status: LibraryItemStatus) => items.filter((item) => item.status === status).length;
    return { todos: items.length, em_andamento: by("em_andamento"), quero_consumir: by("quero_consumir"), concluido: by("concluido"), pausado: by("pausado"), abandonado: by("abandonado"), favoritos: items.filter((item) => item.is_favorite).length };
  }, [items]);

  const source = tab === "arquivados" ? archived : items;
  const presentTypes = (Object.keys(LIBRARY_ITEM_TYPE_LABELS) as LibraryItemType[]).filter((value) => source.some((item) => item.item_type === value));
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return source
      .filter((item) => {
        if (tab === "favoritos" && !item.is_favorite) return false;
        if (tab !== "todos" && tab !== "favoritos" && tab !== "arquivados" && item.status !== tab) return false;
        if (type && item.item_type !== type) return false;
        if (!term) return true;
        return [item.title, item.subtitle, item.description, ...(item.tags ?? [])].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(term);
      })
      .sort((a, b) => {
        if (sort === "titulo") return a.title.localeCompare(b.title, "pt-BR");
        if (sort === "avaliacao") return (b.rating ?? 0) - (a.rating ?? 0) || b.updated_at.localeCompare(a.updated_at);
        if (sort === "ano") return (b.year ?? 0) - (a.year ?? 0);
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [search, sort, source, tab, type]);

  const continuing = items.filter((item) => item.status === "em_andamento").sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  function step(item: LibraryItem) {
    const current = item.progress_current ?? 0;
    if (item.progress_mode === "percentual") {
      updateProgress.mutate({ itemId: item.id, progress: { mode: "percentual", current: Math.min(100, current + 5) } });
      return;
    }
    const next = Math.min(item.progress_total ?? Infinity, current + 1);
    updateProgress.mutate(
      { itemId: item.id, progress: { mode: "numerico", current: next, total: item.progress_total ?? undefined, unit: item.progress_unit ?? undefined } },
      {
        onSuccess: () => {
          if (item.progress_total && next >= item.progress_total) {
            toast({ title: `Você terminou “${item.title}”?`, tone: "success", action: { label: "Marcar concluído", onClick: () => updateStatus.mutate({ itemId: item.id, status: "concluido" }) } });
          }
        },
      },
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Biblioteca"
        description={isLoading ? "Carregando…" : `${counts.todos} ${counts.todos === 1 ? "item" : "itens"} · ${counts.em_andamento} em andamento · ${counts.quero_consumir} na fila`}
        actions={
          <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setAdding(true)}>
            Adicionar
          </Button>
        }
      />

      {continuing.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold text-fg-2">Continuar</h2>
          <div className="q-scroll-x -mx-1 flex gap-3 px-1 pb-1">
            {continuing.map((item) => (
              <ContinueCard key={item.id} item={item} onOpen={() => openItem(item.id)} onStep={() => step(item)} busy={updateProgress.isPending} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <Tabs<StatusTab>
          label="Filtrar por situação"
          value={tab}
          onChange={setTab}
          options={[
            { value: "todos", label: "Tudo", count: counts.todos },
            { value: "em_andamento", label: "Em andamento", count: counts.em_andamento || null },
            { value: "quero_consumir", label: "Na fila", count: counts.quero_consumir || null },
            { value: "concluido", label: "Concluídos", count: counts.concluido || null },
            ...(counts.pausado ? [{ value: "pausado" as const, label: "Pausados", count: counts.pausado }] : []),
            ...(counts.abandonado ? [{ value: "abandonado" as const, label: "Abandonados", count: counts.abandonado }] : []),
            { value: "favoritos", label: "Favoritos", count: counts.favoritos || null },
            { value: "arquivados", label: "Arquivados" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, autor ou etiqueta" aria-label="Buscar na biblioteca" data-size="sm" className="q-input pl-8!" />
          </div>
          <select value={type} onChange={(event) => setType(event.target.value as LibraryItemType | "")} aria-label="Tipo" data-size="sm" className="q-input w-auto">
            <option value="">Todos os tipos</option>
            {presentTypes.map((value) => (
              <option key={value} value={value}>
                {TYPE_PLURAL[value]}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Ordenar" data-size="sm" className="q-input w-auto">
            <option value="recentes">Mais recentes</option>
            <option value="titulo">Título (A–Z)</option>
            <option value="avaliacao">Melhor avaliados</option>
            <option value="ano">Ano</option>
          </select>
          <Segmented
            label="Visualização"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "grade", label: "Grade", icon: <SquaresFourIcon size={14} /> },
              { value: "lista", label: "Lista", icon: <ListIcon size={14} /> },
            ]}
          />
        </div>

        {error && <Notice title="Não foi possível carregar a Biblioteca">Tente atualizar a página.</Notice>}

        {(tab === "arquivados" ? archivedLoading : isLoading) ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(100px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-[2/3] w-full rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<BooksIcon />}
            title={items.length === 0 ? "Sua estante está vazia" : tab === "arquivados" ? "Nada arquivado" : "Nada por aqui"}
            description={items.length === 0 ? "Adicione livros, filmes, séries, cursos e jogos. Para livros, filmes e séries a capa e os dados são buscados automaticamente." : "Mude o filtro ou a busca para ver outros itens."}
            action={
              items.length === 0 ? (
                <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setAdding(true)}>
                  Adicionar o primeiro
                </Button>
              ) : undefined
            }
          />
        ) : view === "grade" ? (
          <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(100px,1fr))] sm:gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
            {visible.map((item) => (
              <LibraryCard key={item.id} item={item} onOpen={() => openItem(item.id)} />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
            {visible.map((item) => (
              <LibraryRow key={item.id} item={item} onOpen={() => openItem(item.id)} />
            ))}
          </ul>
        )}
      </section>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Adicionar à Biblioteca" description="Busque pelo título para trazer capa e dados, ou preencha à mão." size="md" icon={<BooksIcon />}>
        <NewItemForm
          items={items}
          isCreating={createItem.isPending}
          tmdbApiKey={import.meta.env.VITE_TMDB_API_KEY}
          onCreate={async (input, creators, coverFile) => {
            const created = await createItem.mutateAsync({ input, creators, coverFile });
            setAdding(false);
            toast({ title: "Adicionado à Biblioteca", description: created.title, tone: "success", action: { label: "Abrir", onClick: () => openItem(created.id) } });
          }}
        />
      </Modal>

      <Sheet
        isOpen={selected !== null}
        onClose={() => openItem(null)}
        title={selected?.title}
        description={selected ? [LIBRARY_ITEM_TYPE_LABELS[selected.item_type], selected.subtitle, selected.year].filter(Boolean).join(" · ") : undefined}
        width={520}
        actions={
          selected && (
            <>
              <IconButton label="Editar item" onClick={() => setEditing(selected)}>
                <PencilSimpleIcon />
              </IconButton>
              <IconButton label={selected.is_favorite ? "Remover dos favoritos" : "Favoritar"} active={selected.is_favorite} onClick={() => toggleFavorite.mutate({ itemId: selected.id, isFavorite: !selected.is_favorite })} className={selected.is_favorite ? "text-gold-fg" : undefined}>
                <StarIcon weight={selected.is_favorite ? "fill" : "regular"} />
              </IconButton>
            </>
          )
        }
        footer={
          selected && (
            <>
              <Button variant="ghost" className="mr-auto text-danger" leadingIcon={<TrashIcon size={15} />} onClick={() => setDeleting(selected)}>
                Excluir
              </Button>
              {selected.origin_url && (
                <a href={selected.origin_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium text-fg-2 hover:bg-hover hover:text-fg">
                  <ArrowSquareOutIcon size={15} /> Origem
                </a>
              )}
              <Button
                variant="secondary"
                leadingIcon={selected.is_archived ? <ArrowCounterClockwiseIcon size={15} /> : <ArchiveIcon size={15} />}
                onClick={() =>
                  archiveItem.mutate(
                    { itemId: selected.id, isArchived: !selected.is_archived },
                    { onSuccess: () => { toast({ title: selected.is_archived ? "Item restaurado" : "Item arquivado", tone: "success" }); openItem(null); } },
                  )
                }
              >
                {selected.is_archived ? "Restaurar" : "Arquivar"}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <LibraryCover item={selected} className="w-28 shrink-0 shadow-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-fg-3">
                  Situação
                  <select value={selected.status} disabled={selected.is_archived} onChange={(event) => updateStatus.mutate({ itemId: selected.id, status: event.target.value as LibraryItemStatus })} data-size="sm" className="q-input">
                    {(Object.keys(STATUS_META) as LibraryItemStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                </label>
                {selected.status === "quero_consumir" && !selected.is_archived && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ itemId: selected.id, status: "em_andamento" })}>
                    Começar agora
                  </Button>
                )}
                {selected.status === "em_andamento" && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ itemId: selected.id, status: "concluido" })}>
                    Marcar como concluído
                  </Button>
                )}
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-hover px-2 py-0.5 text-[11px] text-fg-2">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!selected.is_archived && selected.status !== "quero_consumir" && (
              <section>
                <h3 className="mb-2 text-[13px] font-semibold text-fg">Progresso</h3>
                <ItemProgressForm item={selected} isSaving={updateProgress.isPending} onSave={(progress) => updateProgress.mutateAsync({ itemId: selected.id, progress })} />
              </section>
            )}

            <section>
              <h3 className="mb-2 text-[13px] font-semibold text-fg">Sua avaliação</h3>
              <ItemReviewForm item={selected} isSaving={updateReview.isPending} onSave={(review) => updateReview.mutateAsync({ itemId: selected.id, review })} />
            </section>

            {selected.description && (
              <section>
                <h3 className="mb-1.5 text-[13px] font-semibold text-fg">Sinopse</h3>
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">{selected.description}</p>
              </section>
            )}

            <section className="flex flex-col gap-2 rounded-xl border border-line-soft bg-canvas/40 p-3">
              {notebooks.length > 0 && (
                <label className="flex items-center gap-2 text-[13px] text-fg-2">
                  <GraduationCapIcon size={16} className="shrink-0 text-fg-3" />
                  <select
                    value=""
                    onChange={(event) => {
                      const notebookId = event.target.value;
                      if (!notebookId) return;
                      const name = notebooks.find((notebook) => notebook.id === notebookId)?.name;
                      relateLibraryItem(supabase, notebookId, selected.id)
                        .then(() => toast({ title: "Ligado ao caderno", description: name, tone: "success" }))
                        .catch(() => toast({ title: "Não foi possível ligar", description: "Talvez o item já esteja nesse caderno.", tone: "danger" }));
                    }}
                    aria-label="Usar em um caderno de Estudos"
                    data-size="sm"
                    className="q-input flex-1"
                  >
                    <option value="">Usar em um caderno de Estudos…</option>
                    {notebooks
                      .filter((notebook) => notebook.status !== "arquivado")
                      .map((notebook) => (
                        <option key={notebook.id} value={notebook.id}>
                          {notebook.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Button size="xs" variant="ai" leadingIcon={<SparkleIcon size={12} weight="fill" />} onClick={() => openVex(`Me recomende 5 títulos parecidos com "${selected.title}" (${LIBRARY_ITEM_TYPE_LABELS[selected.item_type]}), explicando em uma frase por que cada um combina.`)}>
                  Parecidos
                </Button>
                {selected.status === "concluido" && (
                  <Button size="xs" variant="ai" leadingIcon={<SparkleIcon size={12} weight="fill" />} onClick={() => openVex(`Terminei "${selected.title}". Me ajude a registrar as principais ideias numa nota, fazendo perguntas curtas sobre o que mais me marcou.`)}>
                    Registrar aprendizados
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}
      </Sheet>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Editar item" size="md" icon={<PencilSimpleIcon />}>
        {editing && (creatorsLoading ? (
          <Skeleton className="block h-64 w-full" />
        ) : (
          <EditItemForm
            key={editing.id}
            item={editing}
            creators={editingCreators.map((creator) => creator.name)}
            onCancel={() => setEditing(null)}
            onSubmit={async ({ input, cover, creators }) => {
              await updateItem.mutateAsync({ itemId: editing.id, input, cover, creators });
              setEditing(null);
              toast({ title: "Item atualizado", description: input.title, tone: "success" });
            }}
          />
        ))}
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Excluir da Biblioteca?"
        description={deleting ? `“${deleting.title}”, seu progresso e sua avaliação serão apagados. Para só tirar da estante, arquive.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (!target) return;
          deleteItem.mutate(target.id, { onSuccess: () => { openItem(null); toast({ title: "Item excluído", tone: "success" }); } });
        }}
      />
    </PageContainer>
  );
}
