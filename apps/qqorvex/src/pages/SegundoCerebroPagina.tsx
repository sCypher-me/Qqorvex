import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArchiveIcon, ArrowLeftIcon, ArrowRightIcon, ClockCounterClockwiseIcon, DotsThreeIcon, GraphIcon, LinkSimpleIcon, PlusIcon, StarIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import {
  BlockEditor,
  CheckpointsPanel,
  pageTypeMeta,
  useAddPageTag,
  useAllPageLinks,
  useArchivePage,
  useBacklinks,
  useCreatePageLink,
  useDeletePage,
  usePage,
  usePageTags,
  usePages,
  useRemovePageTag,
  useUpdatePageFavorite,
  useUpdatePageTitle,
} from "@qqorvex/module-segundo-cerebro";
import { ConfirmDialog, DropdownMenu, IconButton, Skeleton, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

function editedLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `Editada hoje às ${time}`;
  return `Editada em ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} às ${time}`;
}

function SideSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <h3 className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5 text-[13px] font-semibold text-fg [&_svg]:size-4 [&_svg]:text-fg-3">
        {icon}
        {title}
      </h3>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function SegundoCerebroPaginaPage() {
  const { pageId = "" } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAccount();
  const { page, isLoading } = usePage(supabase, pageId);
  const { tags } = usePageTags(supabase, pageId);
  const addTag = useAddPageTag(supabase, pageId);
  const removeTag = useRemovePageTag(supabase, pageId);
  const { backlinks } = useBacklinks(supabase, pageId);
  const { links } = useAllPageLinks(supabase);
  const createLink = useCreatePageLink(supabase, pageId);
  const { pages } = usePages(supabase);
  const updateTitle = useUpdatePageTitle(supabase);
  const updateFavorite = useUpdatePageFavorite(supabase);
  const archivePage = useArchivePage(supabase);
  const deletePage = useDeletePage(supabase);

  const [title, setTitle] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [linkTarget, setLinkTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setTitle(page?.title ?? ""), [page?.id, page?.title]);
  usePageMeta(page ? { title: page.title || "Sem título", subtitle: "Notas" } : null);

  const titleById = useMemo(() => new Map(pages.map((item) => [item.id, item.title])), [pages]);
  const outgoing = useMemo(() => links.filter((link) => link.source_page_id === pageId).map((link) => ({ id: link.target_page_id, title: titleById.get(link.target_page_id) })).filter((item): item is { id: string; title: string } => Boolean(item.title)), [links, pageId, titleById]);
  const linkable = pages.filter((item) => item.id !== pageId && !outgoing.some((link) => link.id === item.id));

  function saveTitle() {
    const next = title.trim();
    if (!page || !next || next === page.title) {
      if (!next) setTitle(page?.title ?? "");
      return;
    }
    updateTitle.mutate({ pageId, title: next }, { onError: () => toast({ title: "Não foi possível salvar o título", tone: "danger" }) });
  }

  if (isLoading || !page) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const meta = pageTypeMeta(page.page_type);

  return (
    <div className="mx-auto grid w-full max-w-[1180px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <article className="mx-auto w-full min-w-0 max-w-3xl">
        <div className="flex items-center gap-2 text-[13px] text-fg-3">
          <Link to="/conhecimento/notas" className="inline-flex items-center gap-1 hover:text-fg">
            <ArrowLeftIcon size={13} /> Notas
          </Link>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <meta.icon size={14} /> {meta.label}
          </span>
          <span className="flex-1" />
          <IconButton label={page.is_favorite ? "Remover dos favoritos" : "Favoritar"} active={page.is_favorite} onClick={() => updateFavorite.mutate({ pageId, isFavorite: !page.is_favorite })} className={cx(page.is_favorite && "text-gold-fg")}>
            <StarIcon weight={page.is_favorite ? "fill" : "regular"} />
          </IconButton>
          <DropdownMenu
            label="Ações da página"
            items={[
              { label: "Ver no mapa de conexões", icon: <GraphIcon />, onSelect: () => navigate("/conhecimento/notas?view=mapa") },
              { label: "Arquivar", icon: <ArchiveIcon />, onSelect: () => archivePage.mutate({ pageId, isArchived: true }, { onSuccess: () => { toast({ title: "Página arquivada", tone: "success" }); navigate("/conhecimento/notas"); } }) },
              "separator",
              { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setConfirmDelete(true) },
            ]}
            trigger={(props) => (
              <IconButton {...props} label="Ações da página">
                <DotsThreeIcon weight="bold" />
              </IconButton>
            )}
          />
        </div>

        <textarea
          value={title}
          onChange={(event) => setTitle(event.target.value.replace(/\n/g, ""))}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setTitle(page.title);
              event.currentTarget.blur();
            }
          }}
          rows={1}
          maxLength={160}
          aria-label="Título da página"
          placeholder="Sem título"
          className="mt-4 block w-full resize-none overflow-hidden bg-transparent font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-fg outline-none [field-sizing:content] placeholder:text-fg-4 sm:text-[36px]"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-line-soft pb-4">
          {tags.map((tag) => (
            <span key={tag} className="group inline-flex items-center gap-1 rounded-full bg-hover py-0.5 pl-2.5 pr-1 text-xs text-fg-2">
              #{tag}
              <button type="button" onClick={() => removeTag.mutate(tag)} aria-label={`Remover a tag ${tag}`} className="rounded-full p-0.5 text-fg-4 hover:bg-selected hover:text-fg">
                <XIcon size={10} />
              </button>
            </span>
          ))}
          {addingTag ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const tag = tagDraft.trim().replace(/^#/, "");
                if (tag) addTag.mutate(tag);
                setTagDraft("");
              }}
            >
              <input autoFocus value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onBlur={() => setAddingTag(false)} onKeyDown={(event) => event.key === "Escape" && setAddingTag(false)} placeholder="tag + Enter" aria-label="Nova tag" className="h-6 w-28 rounded-full border border-line bg-field px-2.5 text-xs text-fg outline-none focus:border-gold-line" />
            </form>
          ) : (
            <button type="button" onClick={() => setAddingTag(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-fg-3 hover:border-line-strong hover:text-fg">
              <PlusIcon size={11} /> tag
            </button>
          )}
          <span className="ml-auto text-xs text-fg-4">{editedLabel(page.updated_at)}</span>
        </div>

        <div className="mt-4 min-h-[50dvh]">{userId && <BlockEditor client={supabase} pageId={pageId} userId={userId} />}</div>
      </article>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-20">
        <SideSection title="Conexões" icon={<LinkSimpleIcon />}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-4">Esta página cita</p>
              {outgoing.length === 0 ? (
                <p className="text-[13px] text-fg-3">Nenhuma ligação ainda.</p>
              ) : (
                <ul className="flex flex-col">
                  {outgoing.map((item) => (
                    <li key={item.id}>
                      <Link to={`/conhecimento/notas/${item.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-fg-2 hover:bg-hover hover:text-fg">
                        <ArrowRightIcon size={12} className="shrink-0 text-fg-4" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-4">Citada por</p>
              {backlinks.length === 0 ? (
                <p className="text-[13px] text-fg-3">Nenhuma página aponta para esta.</p>
              ) : (
                <ul className="flex flex-col">
                  {backlinks.map((item) => (
                    <li key={item.id}>
                      <Link to={`/conhecimento/notas/${item.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-fg-2 hover:bg-hover hover:text-fg">
                        <ArrowLeftIcon size={12} className="shrink-0 text-fg-4" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {linkable.length > 0 && (
              <select
                value={linkTarget}
                onChange={(event) => {
                  const target = event.target.value;
                  setLinkTarget("");
                  if (target) createLink.mutate(target, { onSuccess: () => toast({ title: "Páginas ligadas", tone: "success" }) });
                }}
                aria-label="Ligar a outra página"
                data-size="sm"
                className="q-input"
              >
                <option value="">Ligar a outra página…</option>
                {linkable.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </SideSection>
        <SideSection title="Versões" icon={<ClockCounterClockwiseIcon />}>
          <CheckpointsPanel client={supabase} pageId={pageId} />
        </SideSection>
      </aside>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir página?"
        description={`“${page.title}”, seus blocos, ligações e versões serão apagados.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deletePage.mutate(pageId, { onSuccess: () => navigate("/conhecimento/notas") });
        }}
      />
    </div>
  );
}
