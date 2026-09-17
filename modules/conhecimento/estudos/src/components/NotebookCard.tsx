import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@qqorvex/ui";
import type { Notebook, NotebookStatus, NotebookType } from "../types";

/**
 * Mesma lista de `categoryColors` de `@qqorvex/design-system` (o módulo não depende do pacote de
 * tokens) — a cor do caderno é derivada do id, então é estável entre sessões e telas.
 */
const CATEGORY_COLORS = [
  "#43B9D2",
  "#6FAF91",
  "#D2A66F",
  "#8A7FB5",
  "#5E86C8",
  "#C98C45",
  "#C7786E",
  "#A56D98",
  "#4E9A9A",
  "#687A91",
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

export function NotebookCard({ notebook, onDelete }: { notebook: Notebook; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const color = notebookColor(notebook.id);
  const meta = [NOTEBOOK_TYPE_LABEL[notebook.notebook_type], NOTEBOOK_STATUS_LABEL[notebook.status], notebook.area]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative transition-transform duration-150 hover:-translate-y-0.5">
      <Link
        to={`/estudos/${notebook.id}`}
        className="qv-card p-[18px] flex flex-col gap-3.5 text-left transition-colors duration-150 group-hover:border-text-muted"
      >
        <span
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center font-mono text-[13px] font-semibold"
          style={{ background: `${color}22`, color }}
        >
          {notebookInitials(notebook.name)}
        </span>
        <div className="flex flex-col gap-[5px] pr-8">
          <span className="text-[15px] font-semibold text-text-primary">
            {notebook.name}
            {notebook.is_favorite && (
              <span className="text-vex-gold ml-1.5 text-[13px]" aria-label="Favorito">
                ★
              </span>
            )}
          </span>
          <span className="text-xs text-text-muted">{meta}</span>
        </div>
      </Link>
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
