import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArchiveIcon, ArrowCounterClockwiseIcon, CalendarBlankIcon, DotsThreeIcon, LinkSimpleIcon, MagnifyingGlassIcon, NotebookIcon, PlusIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import {
  BasesPanel,
  CREATABLE_PAGE_TYPES,
  GraphView,
  pageTypeMeta,
  useAllPageLinks,
  useAllPageTags,
  useArchivePage,
  useArchivedPages,
  useCreatePage,
  useDeletePage,
  useEnsureDailyNote,
  usePageExcerpts,
  usePages,
  useUpdatePageFavorite,
  type Page,
} from "@qqorvex/module-segundo-cerebro";
import { billingLimitMessage } from "@qqorvex/database";
import { Button, ConfirmDialog, DropdownMenu, EmptyState, Notice, PageContainer, PageHeader, Segmented, SkeletonList, Tabs, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type View = "paginas" | "mapa" | "bases";
type Filter = "todas" | "favoritas" | "nota" | "projeto" | "mapa_mental" | "nota_do_dia" | "arquivadas";
type Sort = "editadas" | "criadas" | "titulo";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "ontem";
  if (days < 7) return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
}

function groupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return "Últimos 7 dias";
  if (days < 30) return "Últimos 30 dias";
  return "Mais antigas";
}

function PageRow({ page, excerpt, tags, links, archived, onToggleFavorite, onArchive, onDelete }: { page: Page; excerpt?: string; tags: string[]; links: number; archived: boolean; onToggleFavorite: () => void; onArchive: () => void; onDelete: () => void }) {
  const meta = pageTypeMeta(page.page_type);
  return (
    <li className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-hover">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-fg-3">
        <meta.icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/conhecimento/notas/${page.id}`} className="truncate text-[14px] font-medium text-fg after:absolute after:inset-0 after:content-['']">
            {page.title || "Sem título"}
          </Link>
          {page.is_favorite && <StarIcon size={13} weight="fill" className="shrink-0 text-gold-fg" aria-label="Favorita" />}
        </div>
        {excerpt && <p className="mt-0.5 line-clamp-1 text-[13px] text-fg-3">{excerpt}</p>}
        {(tags.length > 0 || links > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-hover px-2 py-0.5 text-[11px] text-fg-2">
                #{tag}
              </span>
            ))}
            {links > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-4">
                <LinkSimpleIcon size={11} /> {links}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="shrink-0 pt-1 text-xs text-fg-4">{relativeTime(page.updated_at)}</span>
      <div className="relative z-[1] -my-1 flex shrink-0 items-center">
        <DropdownMenu
          label={`Ações para ${page.title}`}
          items={
            archived
              ? [
                  { label: "Restaurar", icon: <ArrowCounterClockwiseIcon />, onSelect: onArchive },
                  "separator",
                  { label: "Excluir de vez", icon: <TrashIcon />, danger: true, onSelect: onDelete },
                ]
              : [
                  { label: page.is_favorite ? "Remover dos favoritos" : "Favoritar", icon: <StarIcon weight={page.is_favorite ? "fill" : "regular"} />, onSelect: onToggleFavorite },
                  { label: "Arquivar", icon: <ArchiveIcon />, onSelect: onArchive },
                  "separator",
                  { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
                ]
          }
          trigger={(props) => (
            <button type="button" {...props} aria-label={`Ações para ${page.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-4 hover:bg-selected hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100">
              <DotsThreeIcon size={18} weight="bold" />
            </button>
          )}
        />
      </div>
    </li>
  );
}

export function SegundoCerebroPage() {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  usePageMeta({ title: "Notas" });
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "mapa" ? "mapa" : params.get("view") === "bases" ? "bases" : "paginas";
  const setView = (next: View) => setParams((current) => {
    const copy = new URLSearchParams(current);
    if (next === "paginas") copy.delete("view");
    else copy.set("view", next);
    return copy;
  }, { replace: true });

  const [filter, setFilter] = useState<Filter>("todas");
  const [sort, setSort] = useState<Sort>("editadas");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<(typeof CREATABLE_PAGE_TYPES)[number]>("nota");
  const [deleting, setDeleting] = useState<Page | null>(null);

  const { pages, isLoading, error } = usePages(supabase);
  const { pages: archived, isLoading: archivedLoading } = useArchivedPages(supabase, filter === "arquivadas");
  const { links } = useAllPageLinks(supabase);
  const { tags: allTags } = useAllPageTags(supabase);
  const { excerpts } = usePageExcerpts(supabase);
  const createPage = useCreatePage(supabase, userId ?? "");
  const deletePage = useDeletePage(supabase);
  const archivePage = useArchivePage(supabase);
  const updateFavorite = useUpdatePageFavorite(supabase);
  const ensureDailyNote = useEnsureDailyNote(supabase, userId ?? "");

  const tagsByPage = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const item of allTags) result.set(item.page_id, [...(result.get(item.page_id) ?? []), item.tag]);
    return result;
  }, [allTags]);
  const linkCount = useMemo(() => {
    const result = new Map<string, number>();
    for (const link of links) {
      result.set(link.source_page_id, (result.get(link.source_page_id) ?? 0) + 1);
      result.set(link.target_page_id, (result.get(link.target_page_id) ?? 0) + 1);
    }
    return result;
  }, [links]);

  const counts = useMemo(() => {
    const byType = (type: string) => pages.filter((page) => (page.page_type || "nota") === type).length;
    return { todas: pages.length, favoritas: pages.filter((page) => page.is_favorite).length, nota: byType("nota"), projeto: byType("projeto"), mapa_mental: byType("mapa_mental"), nota_do_dia: byType("nota_do_dia") };
  }, [pages]);

  const source = filter === "arquivadas" ? archived : pages;
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const list = source.filter((page) => {
      if (filter === "favoritas" && !page.is_favorite) return false;
      if (filter !== "todas" && filter !== "favoritas" && filter !== "arquivadas" && (page.page_type || "nota") !== filter) return false;
      if (!term) return true;
      return [page.title, excerpts[page.id] ?? "", ...(tagsByPage.get(page.id) ?? [])].join(" ").toLocaleLowerCase("pt-BR").includes(term);
    });
    return list.sort((a, b) => (sort === "titulo" ? a.title.localeCompare(b.title, "pt-BR") : sort === "criadas" ? b.created_at.localeCompare(a.created_at) : b.updated_at.localeCompare(a.updated_at)));
  }, [excerpts, filter, search, sort, source, tagsByPage]);

  const groups = useMemo(() => {
    if (sort === "titulo") return [{ label: "", items: visible }];
    const map = new Map<string, Page[]>();
    for (const page of visible) {
      const label = groupLabel(sort === "criadas" ? page.created_at : page.updated_at);
      map.set(label, [...(map.get(label) ?? []), page]);
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }));
  }, [sort, visible]);

  async function quickCreate(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    try {
      const page = await createPage.mutateAsync({ title, pageType: draftType });
      setDraft("");
      navigate(`/conhecimento/notas/${page.id}`);
    } catch (cause) {
      toast({ title: "Não foi possível criar a página", description: billingLimitMessage(cause) ?? "Tente novamente.", tone: "danger" });
    }
  }

  const openDaily = () => ensureDailyNote.mutate(new Date(), { onSuccess: (page) => navigate(`/conhecimento/notas/${page.id}`), onError: () => toast({ title: "Não foi possível abrir a nota do dia", tone: "danger" }) });
  const linkedPages = new Set(links.flatMap((link) => [link.source_page_id, link.target_page_id])).size;

  return (
    <PageContainer>
      <PageHeader
        title="Notas"
        description={isLoading ? "Carregando…" : `${pages.length} ${pages.length === 1 ? "página" : "páginas"} · ${links.length} ${links.length === 1 ? "conexão" : "conexões"}`}
        actions={
          <>
            <Button variant="secondary" leadingIcon={<CalendarBlankIcon size={16} />} onClick={openDaily} loading={ensureDailyNote.isPending}>
              Nota do dia
            </Button>
            <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => createPage.mutate({ title: "Sem título", pageType: "nota" }, { onSuccess: (page) => navigate(`/conhecimento/notas/${page.id}`) })} loading={createPage.isPending && !draft}>
              Nova página
            </Button>
          </>
        }
      >
        <Tabs<View>
          label="Visualização"
          value={view}
          onChange={setView}
          options={[
            { value: "paginas", label: "Páginas" },
            { value: "mapa", label: "Mapa de conexões" },
            { value: "bases", label: "Bases" },
          ]}
        />
      </PageHeader>

      {view === "mapa" ? (
        <section className="flex flex-col gap-3">
          <p className="text-[13px] text-fg-3">
            {linkedPages} de {pages.length} páginas conectadas. Clique em um ponto para abrir a página; crie ligações na lateral de cada página.
          </p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <GraphView pages={pages} links={links} onSelectPage={(pageId) => navigate(`/conhecimento/notas/${pageId}`)} />
          </div>
        </section>
      ) : view === "bases" ? (
        userId && <BasesPanel client={supabase} userId={userId} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Filtros de páginas" className="flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:overflow-visible">
            {(
              [
                ["todas", "Todas", counts.todas],
                ["favoritas", "Favoritas", counts.favoritas],
                ["nota", "Notas", counts.nota],
                ["projeto", "Projetos", counts.projeto],
                ["mapa_mental", "Mapas mentais", counts.mapa_mental],
                ["nota_do_dia", "Diário", counts.nota_do_dia],
                ["arquivadas", "Arquivadas", null],
              ] as Array<[Filter, string, number | null]>
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-current={filter === value ? "true" : undefined}
                className={cx("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors", filter === value ? "bg-selected font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}
              >
                <span className="flex-1">{label}</span>
                {count !== null && count > 0 && <span className="text-xs tabular-nums text-fg-4">{count}</span>}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col gap-4">
            {filter !== "arquivadas" && (
              <form onSubmit={(event) => void quickCreate(event)} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 focus-within:border-gold-line">
                <PlusIcon size={16} className="ml-2 shrink-0 text-fg-4" />
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Título da nova página — Enter para criar" aria-label="Título da nova página" maxLength={160} className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[14px] text-fg outline-none placeholder:text-fg-4" />
                <select value={draftType} onChange={(event) => setDraftType(event.target.value as typeof draftType)} aria-label="Tipo da página" data-size="sm" className="q-input w-auto">
                  {CREATABLE_PAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {pageTypeMeta(type).label}
                    </option>
                  ))}
                </select>
                {draft.trim() && (
                  <Button type="submit" size="sm" loading={createPage.isPending}>
                    Criar
                  </Button>
                )}
              </form>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, conteúdo ou tag" aria-label="Buscar páginas" data-size="sm" className="q-input pl-8!" />
              </div>
              <Segmented<Sort>
                label="Ordenar"
                size="sm"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "editadas", label: "Recentes" },
                  { value: "criadas", label: "Criação" },
                  { value: "titulo", label: "A–Z" },
                ]}
              />
            </div>

            {error && <Notice title="Não foi possível carregar as páginas">Tente atualizar a tela.</Notice>}

            {(filter === "arquivadas" ? archivedLoading : isLoading) ? (
              <div className="rounded-xl border border-line bg-surface">
                <SkeletonList rows={6} leading />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<NotebookIcon />}
                title={filter === "arquivadas" ? "Nada arquivado" : pages.length === 0 ? "Sua primeira página" : "Nenhuma página encontrada"}
                description={filter === "arquivadas" ? "Páginas arquivadas ficam aqui e podem ser restauradas." : pages.length === 0 ? "Notas, projetos e mapas mentais com blocos ricos: listas, tarefas, tabelas, código, imagens e ligações entre páginas." : "Tente outra busca ou outro filtro."}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group) => (
                  <section key={group.label || "all"} className="overflow-hidden rounded-xl border border-line bg-surface">
                    {group.label && <h3 className="border-b border-line-soft bg-raised/60 px-4 py-2 text-xs font-semibold text-fg-2">{group.label}</h3>}
                    <ul className="divide-y divide-line-soft">
                      {group.items.map((page) => (
                        <PageRow
                          key={page.id}
                          page={page}
                          excerpt={excerpts[page.id]}
                          tags={tagsByPage.get(page.id) ?? []}
                          links={linkCount.get(page.id) ?? 0}
                          archived={filter === "arquivadas"}
                          onToggleFavorite={() => updateFavorite.mutate({ pageId: page.id, isFavorite: !page.is_favorite })}
                          onArchive={() =>
                            archivePage.mutate(
                              { pageId: page.id, isArchived: filter !== "arquivadas" },
                              { onSuccess: () => toast({ title: filter === "arquivadas" ? "Página restaurada" : "Página arquivada", tone: "success", action: filter === "arquivadas" ? undefined : { label: "Desfazer", onClick: () => archivePage.mutate({ pageId: page.id, isArchived: false }) } }) },
                            )
                          }
                          onDelete={() => setDeleting(page)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Excluir página?"
        description={deleting ? `“${deleting.title}”, seus blocos e ligações serão apagados. Para guardar sem ver na lista, arquive.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) deletePage.mutate(target.id, { onSuccess: () => toast({ title: "Página excluída", tone: "success" }) });
        }}
      />
    </PageContainer>
  );
}
