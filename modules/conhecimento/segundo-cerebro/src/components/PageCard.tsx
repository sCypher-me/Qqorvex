import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@qqorvex/ui";
import { DAILY_NOTE_PAGE_TYPE } from "../service";
import type { Page } from "../types";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`;
}

function pageTypeLabel(pageType: string): string {
  if (pageType === DAILY_NOTE_PAGE_TYPE) return "Nota do dia";
  const label = pageType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Card clicável da lista do Segundo Cérebro. `linkTitles` (opcional) são os títulos das páginas
 * para as quais esta página aponta (`page_links`), exibidos como pílulas cyan.
 */
export function PageCard({ page, linkTitles = [], isArchived = false, onToggleFavorite, onArchive, onDelete }: { page: Page; linkTitles?: string[]; isArchived?: boolean; onToggleFavorite?: () => void; onArchive?: () => void; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 group flex min-h-[174px] flex-col gap-3 p-5 transition-[border-color,background,transform] duration-200 hover:-translate-y-1 hover:border-line-strong hover:bg-raised">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--q-gold-soft)] font-display text-base text-gold-fg">{page.page_type === "mapa_mental" ? "⌁" : page.page_type === "projeto" ? "◈" : "✦"}</span>
          <div className="min-w-0 flex-1">
            <Link to={`/conhecimento/notas/${page.id}`} className="block truncate pt-1 text-[15px] font-semibold text-fg hover:text-gold-fg focus-visible:outline-gold" title={page.title}>{page.title}</Link>
            <span className="font-mono text-[11px] text-fg-3">Editado {formatShortDate(page.updated_at)}</span>
          </div>
          {onToggleFavorite && !isArchived && <button type="button" aria-label={page.is_favorite ? `Remover ${page.title} das favoritas` : `Adicionar ${page.title} às favoritas`} aria-pressed={page.is_favorite} title={page.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={onToggleFavorite} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 h-7 w-7 shrink-0 text-sm ${page.is_favorite ? "!text-gold-fg" : "text-fg-3"}`}>★</button>}
          <button
            type="button"
            aria-label={`Excluir "${page.title}"`}
            title="Excluir página"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 h-6 w-6 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:!border-danger hover:!text-danger"
          >
            ✕
          </button>
        </div>
        <Link to={`/conhecimento/notas/${page.id}`} aria-label={`Abrir página ${page.title}`} className="flex flex-1 flex-col gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-line text-fg-2 self-start text-[10px] uppercase tracking-[.08em]">{pageTypeLabel(page.page_type)}</span>
        {linkTitles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkTitles.map((title, index) => (
              <span
                key={`${title}-${index}`}
                className="rounded-full bg-gold-soft px-[9px] py-[3px] text-[11px] text-gold-fg"
              >
                {title}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-[11px] text-fg-3">
          <span>{linkTitles.length > 0 ? `${linkTitles.length} ${linkTitles.length === 1 ? "conexão" : "conexões"}` : "sem conexões ainda"}</span>
          {!isArchived && <span className="text-gold-fg opacity-0 transition-opacity group-hover:opacity-100">Abrir →</span>}
        </div>
        </Link>
        {onArchive && <div className="flex justify-end border-t border-line pt-2"><button type="button" onClick={onArchive} className="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 text-fg-2 hover:bg-hover hover:text-fg h-7 px-2.5 text-xs">{isArchived ? "Restaurar" : "Arquivar"}</button></div>}
      </article>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${page.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
