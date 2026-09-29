import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@qqorvex/auth";
import { Button, Card, ChipTabs, EmptyState, Input, Notice, SectionTitle, Skeleton } from "@qqorvex/ui";
import { useAllPageLinks, useAllPageTags, useArchivedPages, useArchivePage, useCreatePage, useDeletePage, useEnsureDailyNote, usePages, useUpdatePageFavorite, NewPageForm, PageCard, GraphView, BasesPanel } from "@qqorvex/module-segundo-cerebro";
import type { Page } from "@qqorvex/module-segundo-cerebro";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type ViewMode = "paginas" | "mapa" | "bases";
type PageFilter = "todas" | "favoritas" | "notas" | "projetos" | "arquivadas";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "paginas", label: "Páginas" }, { value: "mapa", label: "Mapa mental" }, { value: "bases", label: "Bases" },
];
const FILTER_OPTIONS: { value: PageFilter; label: string }[] = [
  { value: "todas", label: "Tudo" }, { value: "favoritas", label: "Favoritas" }, { value: "notas", label: "Notas" }, { value: "projetos", label: "Projetos" }, { value: "arquivadas", label: "Arquivadas" },
];

function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return <div className="editorial-knowledge-stat px-4 py-3.5 flex flex-col gap-1.5"><span className="qv-eyebrow">{label}</span><strong className="font-display text-[24px] text-text-primary">{value}</strong><span className="text-xs text-text-muted">{hint}</span></div>;
}

function PageSidebar({ pages, viewMode, setViewMode, pageFilter, setPageFilter, onCreateDailyNote }: { pages: Page[]; viewMode: ViewMode; setViewMode: (value: ViewMode) => void; pageFilter: PageFilter; setPageFilter: (value: PageFilter) => void; onCreateDailyNote: () => void }) {
  return <aside className="hidden xl:flex w-[208px] shrink-0 flex-col gap-5">
    <div className="qv-card p-3 flex flex-col gap-1">
      <span className="qv-eyebrow px-2 py-1.5">Seu espaço</span>
      <button type="button" onClick={() => { setViewMode("paginas"); setPageFilter("todas"); }} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors ${viewMode === "paginas" && pageFilter === "todas" ? "bg-chip-cyan text-text-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}><span className="text-vex-cyan">▦</span> Todas as páginas <span className="ml-auto font-mono text-[11px] text-text-muted">{pages.length}</span></button>
      <button type="button" onClick={() => { setViewMode("paginas"); setPageFilter("favoritas"); }} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors ${viewMode === "paginas" && pageFilter === "favoritas" ? "bg-chip-cyan text-text-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}><span className="text-vex-gold">★</span> Favoritas <span className="ml-auto font-mono text-[11px] text-text-muted">{pages.filter((page) => page.is_favorite).length}</span></button>
      <button type="button" onClick={onCreateDailyNote} className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] text-text-secondary transition-colors hover:bg-chip-neutral hover:text-text-primary"><span className="text-vex-cyan">◷</span> Nota do dia</button>
    </div>
    <div className="qv-card p-3 flex flex-col gap-1">
      <span className="qv-eyebrow px-2 py-1.5">Visualizações</span>
      <button type="button" onClick={() => setViewMode("mapa")} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors ${viewMode === "mapa" ? "bg-chip-cyan text-text-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}><span className="text-vex-cyan">⌁</span> Mapa mental</button>
      <button type="button" onClick={() => setViewMode("bases")} className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors ${viewMode === "bases" ? "bg-chip-cyan text-text-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}><span className="text-vex-cyan">▤</span> Bases</button>
    </div>
    <div className="qv-well p-3.5 flex flex-col gap-2.5"><span className="qv-eyebrow">Atalho</span><span className="text-[13px] leading-relaxed text-text-secondary">Dentro de uma página, use <kbd className="qv-pill qv-pill-outline">/</kbd> para inserir qualquer bloco.</span></div>
  </aside>;
}

export function SegundoCerebroPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  usePageMeta({ title: "Segundo Cérebro", subtitle: "Páginas, mapas mentais e bases para conectar suas ideias." });
  const [viewMode, setViewMode] = useState<ViewMode>(searchParams.get("view") === "mapa" ? "mapa" : "paginas");
  const [pageFilter, setPageFilter] = useState<PageFilter>("todas");
  const [search, setSearch] = useState("");
  const { pages, isLoading, error } = usePages(supabase);
  const { pages: archivedPages, isLoading: isArchivedLoading, error: archivedError } = useArchivedPages(supabase, pageFilter === "arquivadas");
  const { links } = useAllPageLinks(supabase);
  const { tags: allTags } = useAllPageTags(supabase);
  const createPage = useCreatePage(supabase, userId);
  const deletePage = useDeletePage(supabase);
  const archivePage = useArchivePage(supabase);
  const updateFavorite = useUpdatePageFavorite(supabase);
  const ensureDailyNote = useEnsureDailyNote(supabase, userId);

  const linkTitlesByPage = useMemo(() => {
    const titleById = new Map(pages.map((page) => [page.id, page.title]));
    const result = new Map<string, string[]>();
    for (const link of links) {
      const targetTitle = titleById.get(link.target_page_id);
      if (!targetTitle) continue;
      result.set(link.source_page_id, [...(result.get(link.source_page_id) ?? []), targetTitle]);
    }
    return result;
  }, [pages, links]);
  const tagsByPage = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const item of allTags) result.set(item.page_id, [...(result.get(item.page_id) ?? []), item.tag]);
    return result;
  }, [allTags]);

  const pageSource = pageFilter === "arquivadas" ? archivedPages : pages;
  const filteredPages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return pageSource.filter((page) => {
      const matchesFilter = pageFilter === "todas" || pageFilter === "arquivadas" || (pageFilter === "favoritas" ? page.is_favorite : pageFilter === "notas" ? page.page_type === "nota" || page.page_type === "nota_do_dia" : page.page_type === "projeto");
      const searchable = [page.title, page.page_type, ...(tagsByPage.get(page.id) ?? []), ...(linkTitlesByPage.get(page.id) ?? [])].join(" ").toLocaleLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [linkTitlesByPage, pageFilter, pageSource, search, tagsByPage]);
  const linkedPageCount = new Set(links.flatMap((link) => [link.source_page_id, link.target_page_id])).size;
  const handleCreateDailyNote = () => ensureDailyNote.mutate(new Date(), { onSuccess: (page) => navigate(`/segundo-cerebro/${page.id}`) });
  const visibleLoading = pageFilter === "arquivadas" ? isArchivedLoading : isLoading;
  const visibleError = pageFilter === "arquivadas" ? archivedError : error;

  return <div className="qv-page editorial-module-page flex flex-col gap-6 pb-8">
    <section className="editorial-module-hero">
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-2 text-vex-cyan-bright"><span className="w-2 h-2 rounded-full bg-vex-cyan-bright" aria-hidden="true" /><span className="qv-eyebrow">Segundo cérebro · seu conhecimento</span></div>
        <div className="flex flex-col gap-2 max-w-[780px]"><h1 className="font-display text-[clamp(28px,4vw,44px)] leading-[1.08] font-semibold m-0">Pense em páginas. Conecte ideias.</h1><p className="text-[15px] leading-relaxed text-text-secondary max-w-[670px] m-0">Escreva como no Notion, ligue conceitos como no Obsidian e deixe seu conhecimento encontrar novos caminhos.</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-[800px]"><Stat label="Páginas" value={pages.length} hint="ideias guardadas" /><Stat label="Conexões" value={links.length} hint="links internos" /><Stat label="No mapa" value={linkedPageCount} hint="páginas conectadas" /><Stat label="Favoritas" value={pages.filter((page) => page.is_favorite).length} hint="acessos rápidos" /></div>
      </div>
    </section>

    <div className="flex items-center gap-2 overflow-x-auto xl:hidden"><ChipTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} /></div>
    <div className="flex items-start gap-5">
      <PageSidebar pages={pages} viewMode={viewMode} setViewMode={setViewMode} pageFilter={pageFilter} setPageFilter={setPageFilter} onCreateDailyNote={handleCreateDailyNote} />
      <main className="flex flex-col gap-5 min-w-0 flex-1">
        {viewMode === "bases" ? <BasesPanel client={supabase} userId={userId} /> : viewMode === "mapa" ? <section className="flex flex-col gap-4"><div className="flex flex-col sm:flex-row sm:items-end gap-3"><div className="flex-1"><SectionTitle meta="páginas e links internos">Mapa mental</SectionTitle><p className="text-sm text-text-muted mt-1.5 m-0">Clique em qualquer nó para abrir a página. Crie novas conexões dentro do editor para expandir o mapa.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setViewMode("paginas")}>Ver páginas</Button></div><GraphView pages={pages} links={links} onSelectPage={(pageId) => navigate(`/segundo-cerebro/${pageId}`)} /></section> : <>
          <div className="qv-card p-4 sm:p-5 flex flex-col gap-4"><div className="flex flex-col gap-4"><div className="flex flex-col lg:flex-row lg:items-end gap-3"><div className="flex-1"><SectionTitle meta={`${filteredPages.length} exibidas`}>{pageFilter === "arquivadas" ? "Arquivo" : "Suas páginas"}</SectionTitle><span className="text-sm text-text-muted">{pageFilter === "arquivadas" ? "Páginas guardadas sem sair do seu espaço." : "Um arquivo vivo para notas, projetos e ideias que merecem voltar."}</span></div><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar páginas..." aria-label="Buscar páginas" className="min-w-[210px] lg:max-w-[280px]" /></div>{pageFilter !== "arquivadas" && <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end"><NewPageForm isCreating={createPage.isPending} onCreate={(input) => createPage.mutateAsync(input).then((page) => { navigate(`/segundo-cerebro/${page.id}`); return page; })} /></div>}</div><ChipTabs options={FILTER_OPTIONS} value={pageFilter} onChange={setPageFilter} /></div>
          {visibleError && <Notice tone="error" title="Não foi possível carregar as páginas">Tente atualizar a tela. Suas ideias já criadas continuam seguras.</Notice>}
          {ensureDailyNote.isError && <Notice tone="error" title="Não foi possível abrir sua nota do dia">Tente novamente; nenhuma página foi apagada.</Notice>}
          {visibleLoading ? <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[154px] w-full rounded-2xl" />)}</div> : filteredPages.length === 0 ? <Card className="min-h-[190px] items-center justify-center text-center"><span className="w-11 h-11 rounded-full bg-[var(--qv-chip-cyan)] text-vex-cyan-bright flex items-center justify-center font-display text-xl">⌁</span><span className="font-semibold text-text-primary">{pageFilter === "arquivadas" ? "Seu arquivo está vazio" : pages.length === 0 ? "Seu conhecimento começa com uma página" : "Nenhuma página encontrada"}</span><EmptyState>{pageFilter === "arquivadas" ? "Quando arquivar uma página, ela poderá ser restaurada por aqui." : pages.length === 0 ? "Capture uma ideia, uma pergunta ou um projeto. Depois, conecte-o ao restante." : "Tente buscar outro termo ou altere o filtro."}</EmptyState></Card> : <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">{filteredPages.map((page) => <PageCard key={page.id} page={page} isArchived={pageFilter === "arquivadas"} linkTitles={linkTitlesByPage.get(page.id)} onToggleFavorite={pageFilter === "arquivadas" ? undefined : () => updateFavorite.mutate({ pageId: page.id, isFavorite: !page.is_favorite })} onArchive={() => archivePage.mutate({ pageId: page.id, isArchived: pageFilter !== "arquivadas" })} onDelete={() => deletePage.mutate(page.id)} />)}</div>}
        </>}
      </main>
    </div>
  </div>;
}
