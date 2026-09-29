import { Link } from "react-router-dom";
import { ArchiveIcon, CheckCircleIcon, DotsThreeIcon, PauseIcon, PencilSimpleIcon, PlayIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import { categoryColor } from "@qqorvex/design-system";
import { Badge, DropdownMenu, cx, type BadgeTone } from "@qqorvex/ui";
import type { NotebookStats } from "../repository";
import type { Notebook, NotebookStatus, NotebookType } from "../types";

export const NOTEBOOK_TYPE_LABEL: Record<NotebookType, string> = {
  materia: "Matéria",
  curso: "Curso",
  certificacao: "Certificação",
  preparacao_prova: "Preparação para prova",
  tema_estudo: "Tema de estudo",
  outro: "Outro",
};

export const NOTEBOOK_STATUS: Record<NotebookStatus, { label: string; tone: BadgeTone }> = {
  ativo: { label: "Ativo", tone: "success" },
  pausado: { label: "Pausado", tone: "warning" },
  concluido: { label: "Concluído", tone: "info" },
  arquivado: { label: "Arquivado", tone: "neutral" },
};

/** Cor estável do caderno, derivada do id (mesma em todas as telas). */
export function notebookColor(notebookId: string): string {
  return categoryColor(notebookId);
}

export interface NotebookCardProps {
  notebook: Notebook;
  stats?: NotebookStats;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onSetStatus: (status: NotebookStatus) => void;
  onDelete: () => void;
}

/** Cartão de caderno: tipo e contexto, o que há dentro e quanto falta revisar. */
export function NotebookCard({ notebook, stats, onToggleFavorite, onEdit, onSetStatus, onDelete }: NotebookCardProps) {
  const color = notebookColor(notebook.id);
  const context = [notebook.area, notebook.institution].filter(Boolean).join(" · ");
  const status = NOTEBOOK_STATUS[notebook.status];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm">
      <span aria-hidden="true" className="h-1 w-full" style={{ background: color }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[15px] font-semibold" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
            {notebook.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <Link to={`/conhecimento/estudos/${notebook.id}`} className="line-clamp-2 text-[15px] font-semibold leading-snug text-fg after:absolute after:inset-0 after:content-['']">
              {notebook.name}
            </Link>
            <p className="mt-0.5 truncate text-xs text-fg-3">{[NOTEBOOK_TYPE_LABEL[notebook.notebook_type], context].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="relative z-[1] flex items-center gap-0.5">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={notebook.is_favorite}
              aria-label={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"}
              className={cx("flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-hover", notebook.is_favorite ? "text-gold-fg" : "text-fg-4 hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}
            >
              <StarIcon size={16} weight={notebook.is_favorite ? "fill" : "regular"} />
            </button>
            <DropdownMenu
              label={`Ações para ${notebook.name}`}
              items={[
                { label: "Editar caderno", icon: <PencilSimpleIcon />, onSelect: onEdit },
                notebook.status === "ativo"
                  ? { label: "Pausar", icon: <PauseIcon />, onSelect: () => onSetStatus("pausado") }
                  : { label: "Retomar", icon: <PlayIcon />, onSelect: () => onSetStatus("ativo") },
                ...(notebook.status !== "concluido" ? [{ label: "Marcar como concluído", icon: <CheckCircleIcon />, onSelect: () => onSetStatus("concluido") }] : []),
                ...(notebook.status !== "arquivado" ? [{ label: "Arquivar", icon: <ArchiveIcon />, onSelect: () => onSetStatus("arquivado") }] : []),
                "separator",
                { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
              ]}
              trigger={(props) => (
                <button type="button" {...props} aria-label={`Ações para ${notebook.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg">
                  <DotsThreeIcon size={18} weight="bold" />
                </button>
              )}
            />
          </div>
        </div>

        {notebook.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-fg-2">{notebook.description}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-fg-3">
          <span>
            <strong className="font-semibold text-fg-2 tabular-nums">{stats?.summaries ?? 0}</strong> {stats?.summaries === 1 ? "resumo" : "resumos"}
          </span>
          <span>
            <strong className="font-semibold text-fg-2 tabular-nums">{stats?.flashcards ?? 0}</strong> {stats?.flashcards === 1 ? "cartão" : "cartões"}
          </span>
          {notebook.status !== "ativo" ? (
            <Badge tone={status.tone} className="ml-auto">
              {status.label}
            </Badge>
          ) : stats && stats.due > 0 ? (
            <Badge tone="gold" className="ml-auto">
              {stats.due} para revisar
            </Badge>
          ) : null}
        </div>
      </div>
    </article>
  );
}
