import { Link } from "react-router-dom";
import { ArchiveIcon, CheckCircleIcon, DotsThreeIcon, PauseIcon, PencilSimpleIcon, PlayIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge, DropdownMenu, cx, type BadgeTone } from "@qqorvex/ui";
import type { NotebookStats } from "../repository";
import type { Notebook, NotebookStatus, NotebookType } from "../types";
import { NotebookCoverArtwork } from "./NotebookCover";

export const NOTEBOOK_TYPE_LABEL: Record<NotebookType, string> = {
  materia: "Matéria", curso: "Curso", certificacao: "Certificação", preparacao_prova: "Preparação para prova", tema_estudo: "Tema de estudo", outro: "Outro",
};

export const NOTEBOOK_STATUS: Record<NotebookStatus, { label: string; tone: BadgeTone }> = {
  ativo: { label: "Ativo", tone: "success" }, pausado: { label: "Pausado", tone: "warning" }, concluido: { label: "Concluído", tone: "info" }, arquivado: { label: "Arquivado", tone: "neutral" },
};

export interface NotebookCardProps {
  notebook: Notebook;
  stats?: NotebookStats;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onSetStatus: (status: NotebookStatus) => void;
  onDelete: () => void;
}

/** Capa de caderno com nome, contexto e decoração escolhida pela pessoa. */
export function NotebookCard({ notebook, stats, onToggleFavorite, onEdit, onSetStatus, onDelete }: NotebookCardProps) {
  const context = [NOTEBOOK_TYPE_LABEL[notebook.notebook_type], notebook.area, notebook.institution].filter(Boolean).join(" · ");
  const status = NOTEBOOK_STATUS[notebook.status];

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm">
      <div className="relative p-2 pb-0">
        <NotebookCoverArtwork title={notebook.name} subtitle={context} theme={notebook.cover_theme} stickers={notebook.cover_stickers} imageUrl={notebook.cover_image_url} className="h-[184px]" />
        <Link to={`/conhecimento/estudos/${notebook.id}`} aria-label={`Abrir caderno ${notebook.name}`} className="absolute inset-2 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" />
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full border border-white/15 bg-black/30 p-0.5 backdrop-blur-sm">
          <button type="button" onClick={onToggleFavorite} aria-pressed={notebook.is_favorite} aria-label={notebook.is_favorite ? "Remover dos favoritos" : "Favoritar"} className={cx("flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15", notebook.is_favorite ? "text-gold" : "text-white/70 hover:text-white")}>
            <StarIcon size={16} weight={notebook.is_favorite ? "fill" : "regular"} />
          </button>
          <DropdownMenu
            label={`Ações para ${notebook.name}`}
            items={[
              { label: "Editar capa e caderno", icon: <PencilSimpleIcon />, onSelect: onEdit },
              notebook.status === "ativo" ? { label: "Pausar", icon: <PauseIcon />, onSelect: () => onSetStatus("pausado") } : { label: "Retomar", icon: <PlayIcon />, onSelect: () => onSetStatus("ativo") },
              ...(notebook.status !== "concluido" ? [{ label: "Marcar como concluído", icon: <CheckCircleIcon />, onSelect: () => onSetStatus("concluido") }] : []),
              ...(notebook.status !== "arquivado" ? [{ label: "Arquivar", icon: <ArchiveIcon />, onSelect: () => onSetStatus("arquivado") }] : []),
              "separator",
              { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
            ]}
            trigger={(props) => <button type="button" {...props} aria-label={`Ações para ${notebook.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"><DotsThreeIcon size={18} weight="bold" /></button>}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 pt-3">
        {notebook.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-fg-2">{notebook.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-3">
          <span><strong className="font-semibold text-fg-2 tabular-nums">{stats?.summaries ?? 0}</strong> {stats?.summaries === 1 ? "resumo" : "resumos"}</span>
          <span><strong className="font-semibold text-fg-2 tabular-nums">{stats?.flashcards ?? 0}</strong> {stats?.flashcards === 1 ? "cartão" : "cartões"}</span>
          {notebook.status !== "ativo" ? <Badge tone={status.tone} className="ml-auto">{status.label}</Badge> : stats && stats.due > 0 ? <Badge tone="gold" className="ml-auto">{stats.due} para revisar</Badge> : null}
        </div>
      </div>
    </article>
  );
}
