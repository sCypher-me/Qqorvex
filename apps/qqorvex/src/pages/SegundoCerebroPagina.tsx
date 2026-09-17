import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, EmptyState } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import {
  usePage,
  usePageTags,
  useAddPageTag,
  useRemovePageTag,
  useBacklinks,
  useCreatePageLink,
  usePages,
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

  const [tagInput, setTagInput] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");

  usePageMeta(page ? { title: page.title, subtitle: "Segundo Cérebro" } : null);

  const linkablePages = pages.filter((p) => p.id !== pageId);

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="qv-card flex min-w-0 flex-col gap-[18px] px-8 py-7">
        <div className="flex items-center gap-3">
          <span className="flex-1 font-display text-[26px] font-semibold leading-tight text-text-primary">
            {page?.title ?? "..."}
          </span>
          <Link
            to="/segundo-cerebro"
            className="qv-btn qv-btn-quiet qv-btn-sm"
          >
            ‹ Todas as páginas
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

        <BlockEditor client={supabase} pageId={pageId} userId={session!.user.id} />
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <Card>
          <span className="font-display text-base font-semibold text-text-primary">Tags</span>
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
          <span className="font-display text-base font-semibold text-text-primary">Links internos</span>
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

          <span className="qv-eyebrow pt-1">Backlinks</span>
          {backlinks.length === 0 ? (
            <EmptyState>Nenhuma página referencia esta ainda.</EmptyState>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {backlinks.map((backlink) => (
                <Link
                  key={backlink.id}
                  to={`/segundo-cerebro/${backlink.id}`}
                  className="rounded-full bg-[rgba(67,185,210,.10)] px-[9px] py-[3px] text-[11px] text-vex-cyan-bright transition-colors hover:bg-[rgba(67,185,210,.18)]"
                >
                  {backlink.title}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CheckpointsPanel client={supabase} pageId={pageId} />
        </Card>
      </aside>
    </div>
  );
}
