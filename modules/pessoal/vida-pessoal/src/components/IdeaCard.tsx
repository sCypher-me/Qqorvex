import { useState } from "react";
import { FolderSimplePlusIcon, LightbulbIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { ConfirmDialog } from "@qqorvex/ui";
import type { Idea } from "../types";
import { KebabMenu } from "./PanelShell";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatCapturedAt(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${sameYear ? "" : ` ${date.getFullYear()}`}`;
}

/** Ideia é captura rápida; quando amadurece, vira projeto (a ideia sai da caixa de entrada). */
export function IdeaCard({ idea, onEdit, onDelete, onPromote }: { idea: Idea; onEdit?: () => void; onDelete: () => void; onPromote?: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <article className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <LightbulbIcon size={16} className="mt-0.5 shrink-0 text-gold-fg" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-[13.5px] font-medium leading-snug text-fg">{idea.title}</h3>
        {idea.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-fg-2">{idea.description}</p>}
        <p className="mt-1 text-[11px] text-fg-4">{formatCapturedAt(idea.created_at)}</p>
      </div>
      <KebabMenu
        label={`Ações para ${idea.title}`}
        items={[
          ...(onEdit ? [{ label: "Editar", icon: <PencilSimpleIcon />, onSelect: onEdit }] : []),
          ...(onPromote ? [{ label: "Transformar em projeto", icon: <FolderSimplePlusIcon />, onSelect: onPromote }, "separator" as const] : []),
          { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setConfirmOpen(true) },
        ]}
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${idea.title}"?`}
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
