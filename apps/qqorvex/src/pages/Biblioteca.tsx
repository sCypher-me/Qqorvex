import { useMemo, useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, Chip, ChipTabs, Input, Modal, ProgressBar, Skeleton } from "@qqorvex/ui";
import {
  computeProgressPercent,
  useLibraryItems,
  useCreateLibraryItemWithCreators,
  useUpdateItemStatus,
  useToggleFavorite,
  useDeleteLibraryItem,
  useArchivedLibraryItems,
  useArchiveLibraryItem,
  useUpdateProgress,
  useUpdateItemReview,
  NewItemForm,
  GalleryGrid,
  ItemProgressForm,
  ItemReviewForm,
  LIBRARY_ITEM_TYPE_LABELS,
  LIBRARY_STATUS_LABELS,
  type LibraryItem,
  type LibraryItemStatus,
  type LibraryItemType,
} from "@qqorvex/module-biblioteca";
import { supabase } from "../app/supabase";

/** Rótulos no plural para os chips de filtro (mesma ordem de `LIBRARY_ITEM_TYPE_LABELS`). */
const TYPE_FILTER_LABELS: Record<LibraryItemType, string> = {
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

type TypeFilter = LibraryItemType | "all";
type StatusFilter = LibraryItemStatus | "favorites" | "archived" | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "quero_consumir", label: "Na fila" },
  { value: "concluido", label: "Concluídos" },
  { value: "pausado", label: "Pausados" },
  { value: "abandonado", label: "Abandonados" },
  { value: "favorites", label: "Favoritos" },
  { value: "archived", label: "Arquivados" },
];

function coverBackground(item: LibraryItem): string {
  if (item.cover_url) return `url("${item.cover_url}") center / cover no-repeat`;
  const tones = ["#1a3035", "#30271d", "#242b3b", "#30232d"];
  let hash = 0;
  for (let index = 0; index < item.id.length; index += 1) hash = (hash * 31 + item.id.charCodeAt(index)) | 0;
  const tone = tones[Math.abs(hash) % tones.length];
  return `linear-gradient(145deg, ${tone}, #0b0f14 78%)`;
}

function progressLabel(item: LibraryItem, progress: number | null): string | null {
  if (progress === null || item.progress_current === null) return null;
  if (item.progress_mode === "numerico" && item.progress_total) {
    return `${item.progress_current} de ${item.progress_total}${item.progress_unit ? ` ${item.progress_unit}` : ""}`;
  }
  return `${progress}% concluído`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Atualizado recentemente";
  return `Atualizado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "")}`;
}

export function BibliotecaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const { items, isLoading, error: itemsError } = useLibraryItems(supabase);
  const { items: archivedItems, isLoading: archivedLoading, error: archivedError } = useArchivedLibraryItems(supabase, statusFilter === "archived");
  const createItem = useCreateLibraryItemWithCreators(supabase, userId);
  const updateStatus = useUpdateItemStatus(supabase);
  const toggleFavorite = useToggleFavorite(supabase);
  const deleteItem = useDeleteLibraryItem(supabase);
  const archiveItem = useArchiveLibraryItem(supabase);
  const updateProgress = useUpdateProgress(supabase);
  const updateReview = useUpdateItemReview(supabase);

  // Só mostra chips de tipos que existem no acervo; se o último item de um tipo sair, volta pra "Tudo".
  const sourceItems = statusFilter === "archived" ? archivedItems : items;
  const presentTypes = (Object.keys(LIBRARY_ITEM_TYPE_LABELS) as LibraryItemType[]).filter((type) =>
    sourceItems.some((item) => item.item_type === type),
  );
  const activeTypeFilter: TypeFilter = typeFilter !== "all" && presentTypes.includes(typeFilter) ? typeFilter : "all";
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleItems = useMemo(() => sourceItems.filter((item) => {
    const matchesType = activeTypeFilter === "all" || item.item_type === activeTypeFilter;
    const matchesStatus = statusFilter === "all" || statusFilter === "archived" || (statusFilter === "favorites" ? item.is_favorite : item.status === statusFilter);
    const matchesSearch = !normalizedSearch || [item.title, item.subtitle, item.description, ...(item.tags ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch);
    return matchesType && matchesStatus && matchesSearch;
  }), [activeTypeFilter, normalizedSearch, sourceItems, statusFilter]);

  const inProgressItem = items.find((item) => item.status === "em_andamento") ?? null;
  const showcaseItem = inProgressItem ?? items[0] ?? null;
  const completedCount = items.filter((item) => item.status === "concluido").length;
  const favoriteCount = items.filter((item) => item.is_favorite).length;
  const activeCount = items.filter((item) => item.status === "em_andamento").length;
  const showcaseProgress = showcaseItem ? computeProgressPercent(showcaseItem) : null;
  const selectedRecord = selectedItem ? [...items, ...archivedItems].find((item) => item.id === selectedItem.id) ?? selectedItem : null;
  const selectedProgress = selectedRecord ? computeProgressPercent(selectedRecord) : null;
  const isVisibleLoading = statusFilter === "archived" ? archivedLoading : isLoading;
  const visibleError = statusFilter === "archived" ? archivedError : itemsError;
  const hasMutationError = createItem.isError || updateStatus.isError || toggleFavorite.isError || deleteItem.isError || archiveItem.isError || updateProgress.isError || updateReview.isError;

  return (
    <div className="qv-page editorial-module-page flex flex-col gap-6 pb-8">
      <section className="qv-hero editorial-module-hero" aria-labelledby="library-page-title">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="qv-eyebrow text-vex-gold-bright">Acervo pessoal</p>
            <h1 id="library-page-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-4xl">Biblioteca</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Tudo o que você quer ler, assistir, estudar e acompanhar — organizado para continuar no momento certo.</p>
          </div>
          <Button type="button" variant="primary" onClick={() => setIsAddOpen(true)}>
            <span aria-hidden="true">＋</span> Adicionar item
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo da biblioteca">
        {[
          ["No acervo", items.length, "itens acompanhados", "cyan"],
          ["Em andamento", activeCount, "pedem sua atenção", "gold"],
          ["Concluídos", completedCount, "marcos registrados", "success"],
          ["Favoritos", favoriteCount, "guardados por você", "violet"],
        ].map(([label, value, hint, tone]) => (
          <div key={label} className="qv-card min-w-0 p-4 sm:p-5">
            <div className={`mb-4 h-1 w-8 rounded-full ${tone === "gold" ? "bg-vex-gold-bright" : tone === "success" ? "bg-success" : tone === "violet" ? "bg-[#9584ff]" : "bg-vex-cyan-bright"}`} />
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-text-primary">{value}</p>
            <p className="mt-1 text-xs text-text-muted">{hint}</p>
          </div>
        ))}
      </section>

      {showcaseItem && (
        <section className="relative overflow-hidden rounded-[24px] border border-vex-gold-muted/45 bg-surface-1/50" aria-labelledby="library-showcase-title">
          <div className="absolute inset-0 opacity-20" style={{ background: showcaseItem.cover_url ? `linear-gradient(90deg, var(--qv-surface-canvas) 0%, transparent 70%), ${coverBackground(showcaseItem)}` : undefined }} aria-hidden="true" />
          <div className="relative grid gap-5 p-5 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-xl border border-white/10 bg-surface-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,.9)] sm:w-32" style={{ background: coverBackground(showcaseItem) }}>
              {showcaseItem.cover_url && <img src={showcaseItem.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
              <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">{LIBRARY_ITEM_TYPE_LABELS[showcaseItem.item_type]}</span>
            </div>
            <div className="min-w-0">
              <p className="qv-eyebrow text-vex-gold-bright">{inProgressItem ? "Continuar de onde parou" : "Sua estante começa aqui"}</p>
              <h2 id="library-showcase-title" className="mt-2 truncate font-display text-2xl font-semibold text-text-primary sm:text-3xl">{showcaseItem.title}</h2>
              <p className="mt-1 text-sm text-text-secondary">{showcaseItem.subtitle ?? LIBRARY_STATUS_LABELS[showcaseItem.status]}</p>
              {showcaseItem.description && <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-text-muted">{showcaseItem.description}</p>}
              {showcaseProgress !== null && inProgressItem?.id === showcaseItem.id && (
                <div className="mt-4 max-w-md">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted"><span>Progresso</span><span className="font-mono">{showcaseProgress}%</span></div>
                  <ProgressBar value={showcaseProgress} tone="gold" height={5} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedItem(showcaseItem)}>Ver detalhes</Button>
                {showcaseItem.status !== "concluido" && <Button type="button" variant="quiet" size="sm" onClick={() => updateStatus.mutate({ itemId: showcaseItem.id, status: showcaseItem.status === "em_andamento" ? "concluido" : "em_andamento" })}>{showcaseItem.status === "em_andamento" ? "Marcar concluído" : "Começar agora"}</Button>}
              </div>
            </div>
            <div className="hidden border-l border-border pl-6 text-right sm:block">
              <p className="font-mono text-2xl text-vex-gold-bright">{showcaseItem.year ?? "—"}</p>
              <p className="mt-1 text-xs text-text-muted">ano de referência</p>
            </div>
          </div>
        </section>
      )}

      <section className="qv-card gap-5 p-4 sm:p-5" aria-labelledby="library-shelf-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="library-shelf-title" className="font-display text-xl font-semibold text-text-primary">{statusFilter === "archived" ? "Itens arquivados" : "Sua estante"}</h2>
            <p className="mt-1 text-xs text-text-muted">{statusFilter === "archived" ? "Itens guardados, sem removê-los do seu acervo." : "Escolha um filtro ou abra um item para ver os próximos passos."}</p>
          </div>
          <span className="font-mono text-xs text-text-muted">{visibleItems.length} de {sourceItems.length} exibidos</span>
        </div>

        <Input
          aria-label="Buscar na biblioteca"
          placeholder="Buscar por título, tipo ou etiqueta..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11"
        />

        <div className="flex flex-col gap-3 border-b border-border pb-4">
          <ChipTabs options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar biblioteca por tipo">
            <Chip active={activeTypeFilter === "all"} onClick={() => setTypeFilter("all")}>Todos os tipos</Chip>
            {presentTypes.map((type) => <Chip key={type} active={activeTypeFilter === type} onClick={() => setTypeFilter(type)}>{TYPE_FILTER_LABELS[type]}</Chip>)}
          </div>
        </div>

        {visibleError && <p role="alert" className="m-0 text-sm text-error">Não foi possível carregar os itens da Biblioteca. Tente atualizar a tela.</p>}
        {hasMutationError && <p role="alert" className="m-0 text-sm text-error">Uma alteração não foi salva. Verifique sua conexão e tente novamente.</p>}
        {isVisibleLoading ? (
          <div role="status" aria-label="Carregando biblioteca" className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />)}
          </div>
        ) : (
          <GalleryGrid
            items={visibleItems}
            emptyMessage={statusFilter === "archived" ? "Nenhum item arquivado. Você pode arquivar sem excluir e restaurar depois." : items.length === 0 ? "Sua estante está pronta para receber o primeiro item." : "Nenhum item combina com estes filtros. Tente outra busca ou volte para Todos."}
            onSelect={setSelectedItem}
            onAdvanceStatus={(itemId, status) => updateStatus.mutate({ itemId, status })}
            onToggleFavorite={(itemId, isFavorite) => toggleFavorite.mutate({ itemId, isFavorite })}
            onDelete={(itemId) => deleteItem.mutate(itemId)}
          />
        )}
      </section>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Adicionar item" size="md">
        <NewItemForm
          items={items}
          isCreating={createItem.isPending}
          onCreate={async (input, creators, coverFile) => {
            await createItem.mutateAsync({ input, creators, coverFile });
            setIsAddOpen(false);
          }}
          tmdbApiKey={import.meta.env.VITE_TMDB_API_KEY}
        />
      </Modal>

      <Modal isOpen={selectedRecord !== null} onClose={() => setSelectedItem(null)} title={selectedRecord?.title} size="lg">
        {selectedRecord && (
          <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border" style={{ background: coverBackground(selectedRecord) }}>
              {selectedRecord.cover_url && <img src={selectedRecord.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="qv-pill qv-pill-module">{LIBRARY_ITEM_TYPE_LABELS[selectedRecord.item_type]}</span>
                <span className="qv-pill">{LIBRARY_STATUS_LABELS[selectedRecord.status]}</span>
                {selectedRecord.year && <span className="font-mono text-xs text-text-muted">{selectedRecord.year}</span>}
              </div>
              {selectedRecord.subtitle && <p className="m-0 text-sm text-text-secondary">{selectedRecord.subtitle}</p>}
              {selectedRecord.description && <p className="m-0 text-sm leading-relaxed text-text-secondary">{selectedRecord.description}</p>}
              {!selectedRecord.is_archived && <label className="flex flex-col gap-1.5 text-xs text-text-secondary">Situação
                <select value={selectedRecord.status} onChange={(event) => updateStatus.mutate({ itemId: selectedRecord.id, status: event.target.value as LibraryItemStatus })} className="qv-field py-2 text-sm">
                  {Object.entries(LIBRARY_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                </select>
              </label>}
              {selectedProgress !== null && (
                <div className="qv-well gap-2 p-3">
                  <div className="flex items-center justify-between text-xs"><span className="text-text-muted">Progresso</span><span className="font-mono text-text-primary">{progressLabel(selectedRecord, selectedProgress)}</span></div>
                  <ProgressBar value={selectedProgress} />
                </div>
              )}
              {!selectedRecord.is_archived && <ItemProgressForm item={selectedRecord} isSaving={updateProgress.isPending} onSave={(progress) => updateProgress.mutateAsync({ itemId: selectedRecord.id, progress })} />}
              <ItemReviewForm item={selectedRecord} isSaving={updateReview.isPending} onSave={(review) => updateReview.mutateAsync({ itemId: selectedRecord.id, review })} />
              <div className="mt-auto flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => toggleFavorite.mutate({ itemId: selectedRecord.id, isFavorite: !selectedRecord.is_favorite })}>{selectedRecord.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}</Button>
                {selectedRecord.status !== "concluido" && !selectedRecord.is_archived && <Button type="button" variant="primary" onClick={() => updateStatus.mutate({ itemId: selectedRecord.id, status: "concluido" })}>Marcar concluído</Button>}
                {selectedRecord.origin_url && <a href={selectedRecord.origin_url} target="_blank" rel="noreferrer" className="qv-btn qv-btn-quiet inline-flex items-center">Abrir origem ↗</a>}
                <Button type="button" variant="quiet" onClick={() => archiveItem.mutate({ itemId: selectedRecord.id, isArchived: !selectedRecord.is_archived }, { onSuccess: () => setSelectedItem(null) })}>{selectedRecord.is_archived ? "Restaurar ao acervo" : "Arquivar item"}</Button>
              </div>
              <span className="text-xs text-text-muted">{formatUpdatedAt(selectedRecord.updated_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
