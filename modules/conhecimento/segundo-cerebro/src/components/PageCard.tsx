import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
export function PageCard({ page, linkTitles = [], onDelete }: { page: Page; linkTitles?: string[]; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const open = () => navigate(`/segundo-cerebro/${page.id}`);

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter") open();
        }}
        className="qv-card group flex cursor-pointer flex-col gap-[10px] p-[18px] outline-none transition-colors hover:border-text-muted focus-visible:border-vex-cyan-bright"
      >
        <div className="flex items-center gap-[10px]">
          <span className="flex-1 text-[15px] font-semibold text-text-primary">
            {page.is_favorite && <span className="mr-1.5 text-text-secondary">★</span>}
            {page.title}
          </span>
          <span className="font-mono text-[11px] text-text-muted">{formatShortDate(page.updated_at)}</span>
          <button
            type="button"
            aria-label={`Excluir "${page.title}"`}
            title="Excluir página"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="qv-icon-btn h-6 w-6 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:!border-error hover:!text-error"
          >
            ✕
          </button>
        </div>
        <span className="text-[13px] leading-[1.5] text-text-secondary">{pageTypeLabel(page.page_type)}</span>
        {linkTitles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkTitles.map((title, index) => (
              <span
                key={`${title}-${index}`}
                className="rounded-full bg-[rgba(67,185,210,.10)] px-[9px] py-[3px] text-[11px] text-vex-cyan-bright"
              >
                {title}
              </span>
            ))}
          </div>
        )}
      </div>
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
