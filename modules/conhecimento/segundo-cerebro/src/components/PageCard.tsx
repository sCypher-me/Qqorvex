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
      <article className="qv-card group flex min-h-[174px] flex-col gap-3 p-5 transition-[border-color,background,transform] duration-200 hover:-translate-y-1 hover:border-text-muted hover:bg-vex-raised">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--qv-chip-cyan)] font-display text-base text-vex-cyan-bright">{page.page_type === "mapa_mental" ? "⌁" : page.page_type === "projeto" ? "◈" : "✦"}</span>
          <div className="min-w-0 flex-1">
            <Link to={`/segundo-cerebro/${page.id}`} className="block truncate pt-1 text-[15px] font-semibold text-text-primary hover:text-vex-cyan-bright focus-visible:outline-vex-cyan-bright" title={page.title}>{page.title}</Link>
            <span className="font-mono text-[11px] text-text-muted">Editado {formatShortDate(page.updated_at)}</span>
          </div>
          {onToggleFavorite && !isArchived && <button type="button" aria-label={page.is_favorite ? `Remover ${page.title} das favoritas` : `Adicionar ${page.title} às favoritas`} aria-pressed={page.is_favorite} title={page.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={onToggleFavorite} className={`qv-icon-btn h-7 w-7 shrink-0 text-sm ${page.is_favorite ? "!text-vex-gold" : "text-text-muted"}`}>★</button>}
          <button
            type="button"
            aria-label={`Excluir "${page.title}"`}
            title="Excluir página"
            onClick={() => setConfirmOpen(true)}
            className="qv-icon-btn h-6 w-6 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:!border-error hover:!text-error"
          >
            ✕
          </button>
        </div>
        <Link to={`/segundo-cerebro/${page.id}`} aria-label={`Abrir página ${page.title}`} className="flex flex-1 flex-col gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-vex-cyan-bright">
        <span className="qv-pill qv-pill-outline self-start text-[10px] uppercase tracking-[.08em]">{pageTypeLabel(page.page_type)}</span>
        {linkTitles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkTitles.map((title, index) => (
              <span
                key={`${title}-${index}`}
                className="rounded-full bg-chip-cyan px-[9px] py-[3px] text-[11px] text-vex-cyan-bright"
              >
                {title}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-text-muted">
          <span>{linkTitles.length > 0 ? `${linkTitles.length} ${linkTitles.length === 1 ? "conexão" : "conexões"}` : "sem conexões ainda"}</span>
          {!isArchived && <span className="text-vex-cyan opacity-0 transition-opacity group-hover:opacity-100">Abrir →</span>}
        </div>
        </Link>
        {onArchive && <div className="flex justify-end border-t border-border pt-2"><button type="button" onClick={onArchive} className="qv-btn qv-btn-quiet qv-btn-xs">{isArchived ? "Restaurar" : "Arquivar"}</button></div>}
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
