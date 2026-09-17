import { useState } from "react";
import { Badge, ConfirmDialog } from "@qqorvex/ui";
import type { Idea } from "../types";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatCapturedAt(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS_SHORT[date.getMonth()]}${sameYear ? "" : ` ${date.getFullYear()}`}`;
}

export function IdeaCard({ idea, onDelete }: { idea: Idea; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="qv-card p-4 flex flex-col gap-[9px]">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-[1.35] text-text-primary">{idea.title}</span>
        <button
          type="button"
          className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
          aria-label={`Excluir "${idea.title}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>
      <span className="text-[13px] leading-normal text-text-secondary">
        {idea.description && <>{idea.description} · </>}
        Capturada em <span className="font-mono text-xs">{formatCapturedAt(idea.created_at)}</span>
      </span>
      <Badge tone="neutral" className="self-start">
        Ideia
      </Badge>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${idea.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
