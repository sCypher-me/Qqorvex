import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@qqorvex/ui";
import type { Notebook, NotebookStatus, NotebookType } from "../types";

/**
 * Cores de categoria consumidas pelo módulo a partir dos tokens globais — a cor do caderno é
 * derivada do id, então é estável entre sessões e telas.
 */
const CATEGORY_COLORS = [
  "var(--color-category-cyan)",
  "var(--color-category-green)",
  "var(--color-vex-gold-bright)",
  "var(--color-category-lavender)",
  "var(--color-category-blue)",
  "var(--color-category-amber)",
  "var(--color-category-coral)",
  "var(--color-category-magenta)",
  "var(--color-category-teal)",
  "var(--color-category-bluegray)",
] as const;

const NOTEBOOK_TYPE_LABEL: Record<NotebookType, string> = {
  materia: "Matéria",
  curso: "Curso",
  certificacao: "Certificação",
  preparacao_prova: "Preparação para prova",
  tema_estudo: "Tema de estudo",
  outro: "Outro",
};

const NOTEBOOK_STATUS_LABEL: Record<NotebookStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

export function notebookColor(notebookId: string): string {
  let hash = 0;
  for (let i = 0; i < notebookId.length; i++) {
    hash = (hash * 31 + notebookId.charCodeAt(i)) | 0;
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length]!;
}

export function notebookInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const significant = words.filter((word) => word.length > 2);
  const source = significant.length > 0 ? significant : words;
  if (source.length === 0) return "?";
  if (source.length === 1) return source[0]!.slice(0, 2).toUpperCase();
  return (source[0]![0]! + source[1]![0]!).toUpperCase();
}

export function NotebookCard({ notebook, onDelete, onToggleFavorite }: { notebook: Notebook; onDelete: () => void; onToggleFavorite: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const color = notebookColor(notebook.id);
  const meta = [NOTEBOOK_TYPE_LABEL[notebook.notebook_type], NOTEBOOK_STATUS_LABEL[notebook.status], notebook.area]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative transition-transform duration-200 hover:-translate-y-1">
      <Link
        to={`/estudos/${notebook.id}`}
        className="qv-card p-5 min-h-[190px] flex flex-col gap-4 text-left transition-[border-color,background,box-shadow] duration-200 group-hover:border-text-muted group-hover:bg-vex-raised"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-10 h-10 rounded-[12px] flex items-center justify-center font-mono text-[13px] font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
            {notebookInitials(notebook.name)}
          </span>
        </div>
        <div className="flex flex-col gap-2 pr-8 min-w-0">
          <span className="text-[16px] font-semibold text-text-primary truncate" title={notebook.name}>
            {notebook.name}{notebook.is_favorite && <span className="text-vex-gold ml-1.5 text-[13px]" aria-label="Favorito">★</span>}
          </span>
          <span className="text-xs text-text-muted truncate">{meta}</span>
          {notebook.description && <span className="text-[13px] leading-relaxed text-text-secondary line-clamp-2">{notebook.description}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 text-[11px] text-text-muted font-mono">
          <span>{notebook.start_date ? `desde ${notebook.start_date.split("-").reverse().join("/")}` : "pronto"}</span>
          <span className="text-vex-cyan opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`qv-icon-btn absolute top-[14px] right-[52px] ${notebook.is_favorite ? "text-vex-gold-bright" : "text-text-muted"}`}
        aria-label={notebook.is_favorite ? `Remover ${notebook.name} dos favoritos` : `Adicionar ${notebook.name} aos favoritos`}
        aria-pressed={notebook.is_favorite}
        title={notebook.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {notebook.is_favorite ? "★" : "☆"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="qv-icon-btn absolute top-[14px] right-[14px]"
        aria-label={`Excluir caderno ${notebook.name}`}
        title="Excluir caderno"
      >
        ✕
      </button>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${notebook.name}"?`}
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
