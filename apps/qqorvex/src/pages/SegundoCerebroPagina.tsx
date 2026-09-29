import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, CardHeader, EmptyState } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import {
  usePage,
  usePageTags,
  useAddPageTag,
  useRemovePageTag,
  useBacklinks,
  useCreatePageLink,
  usePages,
  useUpdatePageTitle,
  CheckpointsPanel,
  BlockEditor,
} from "@qqorvex/module-segundo-cerebro";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

function formatEditedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `editado ${time}`;
  return `editado ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`;
}

export function SegundoCerebroPaginaPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { session } = useAuth();
  if (!pageId) return null;

  const { page } = usePage(supabase, pageId);
  const { tags } = usePageTags(supabase, pageId);
  const addTag = useAddPageTag(supabase, pageId);
  const removeTag = useRemovePageTag(supabase, pageId);
  const { backlinks } = useBacklinks(supabase, pageId);
  const createLink = useCreatePageLink(supabase, pageId);
  const { pages } = usePages(supabase);
  const updatePageTitle = useUpdatePageTitle(supabase);

  const [tagInput, setTagInput] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => setTitleDraft(page?.title ?? ""), [page?.title]);

  usePageMeta(page ? { title: page.title, subtitle: "Segundo Cérebro" } : null);

  const linkablePages = pages.filter((p) => p.id !== pageId);
  const pageTypeLabel = page?.page_type === "mapa_mental" ? "Mapa mental" : page?.page_type === "projeto" ? "Projeto" : page?.page_type === "nota_do_dia" ? "Nota do dia" : "Nota";

  return (
    <div className="qv-page mx-auto flex w-full max-w-[1280px] flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
        <Link to="/conhecimento/notas" className="text-vex-cyan transition-colors hover:text-vex-cyan-bright">Segundo Cérebro</Link>
        <span aria-hidden="true">/</span>
        <span>{pageTypeLabel}</span>
        <span className="flex-1" />
        <Link to="/conhecimento/notas?view=mapa" className="qv-btn qv-btn-quiet qv-btn-xs">Abrir mapa mental</Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="qv-card qv-card-vex flex min-w-0 flex-col gap-6 px-6 py-7 sm:px-10 sm:py-9">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--qv-chip-cyan)] font-display text-lg text-vex-cyan-bright">{page?.page_type === "mapa_mental" ? "⌁" : "✦"}</span>
            <span className="qv-eyebrow text-vex-cyan-bright">{pageTypeLabel}</span>
            <Link to="/conhecimento/notas" className="qv-btn qv-btn-quiet qv-btn-xs ml-auto">‹ Voltar</Link>
          </div>
          {isEditingTitle ? (
            <form onSubmit={async (event) => { event.preventDefault(); const title = titleDraft.trim(); if (!title || !page) return; try { await updatePageTitle.mutateAsync({ pageId, title }); setIsEditingTitle(false); } catch { /* O aviso inline mantém o usuário no editor para tentar novamente. */ } }} className="flex max-w-[850px] flex-wrap items-center gap-2">
              <input autoFocus aria-label="Título da página" maxLength={160} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { setTitleDraft(page?.title ?? ""); setIsEditingTitle(false); } }} className="qv-field min-w-[220px] flex-1 font-display text-[clamp(24px,4vw,42px)] font-semibold" />
              <Button type="submit" variant="primary" disabled={!titleDraft.trim() || updatePageTitle.isPending}>{updatePageTitle.isPending ? "Salvando…" : "Salvar título"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setTitleDraft(page?.title ?? ""); setIsEditingTitle(false); }}>Cancelar</Button>
            </form>
          ) : (
            <div className="flex max-w-[850px] flex-wrap items-center gap-3">
              <h1 className="m-0 font-display text-[clamp(30px,5vw,52px)] font-semibold leading-[1.08] text-text-primary">{page?.title ?? "..."}</h1>
              <button type="button" aria-label="Editar título da página" title="Editar título" onClick={() => { setTitleDraft(page?.title ?? ""); setIsEditingTitle(true); }} className="qv-icon-btn h-9 w-9 text-sm">✎</button>
            </div>
          )}
          {updatePageTitle.isError && <span role="alert" className="text-xs text-error">Não foi possível salvar o título. Tente novamente.</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag.mutate(tag)}
              title="Clique para remover"
              aria-label={`Remover a tag ${tag}`}
              className="qv-pill qv-pill-outline cursor-pointer transition-colors hover:border-text-muted hover:text-text-primary"
            >
              {tag} <span className="text-text-muted">✕</span>
            </button>
          ))}
          {page && <span className="px-1 py-[3px] font-mono text-[11px] text-text-muted">{formatEditedAt(page.updated_at)}</span>}
        </div>

        <div className="min-h-[420px]">
          <BlockEditor client={supabase} pageId={pageId} userId={session!.user.id} />
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader title="Propriedades" meta={pageTypeLabel} />
          <span className="qv-eyebrow">Tags</span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!tagInput.trim()) return;
              addTag.mutate(tagInput.trim());
              setTagInput("");
            }}
            className="flex items-center gap-2"
          >
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Nova tag"
              aria-label="Nova tag"
              className="qv-field flex-1 py-2 text-[13px]"
            />
            <Button type="submit" variant="secondary" size="sm">
              Adicionar
            </Button>
          </form>
          {tags.length === 0 && <EmptyState>Nenhuma tag ainda.</EmptyState>}
        </Card>

        <Card>
          <CardHeader title="Conexões" meta={`${backlinks.length} backlinks`} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!linkTargetId) return;
              createLink.mutate(linkTargetId);
              setLinkTargetId("");
            }}
            className="flex items-center gap-2"
          >
            <select
              value={linkTargetId}
              onChange={(e) => setLinkTargetId(e.target.value)}
              aria-label="Ligar a uma página"
              className="qv-field min-w-0 flex-1 py-2 text-[13px]"
            >
              <option value="">Ligar a uma página...</option>
              {linkablePages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="sm">
              Ligar
            </Button>
          </form>

          <span className="qv-eyebrow pt-1">Páginas que chegam aqui</span>
          {backlinks.length === 0 ? (
            <EmptyState>Nenhuma página referencia esta ainda.</EmptyState>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {backlinks.map((backlink) => (
                <Link
                  key={backlink.id}
                  to={`/conhecimento/notas/${backlink.id}`}
                  className="rounded-full bg-chip-cyan px-[9px] py-[3px] text-[11px] text-vex-cyan-bright transition-colors hover:bg-chip-cyan"
                >
                  {backlink.title}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Histórico" meta="checkpoints" />
          <CheckpointsPanel client={supabase} pageId={pageId} />
        </Card>
      </aside>
      </div>
    </div>
  );
}
