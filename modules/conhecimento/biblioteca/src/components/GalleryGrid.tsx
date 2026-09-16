import { useState } from "react";
import { Card, Badge, Button, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { computeProgressPercent, LIBRARY_ITEM_TYPE_LABELS } from "../service";
import type { LibraryItem, LibraryItemStatus } from "../types";

const STATUS_LABEL: Record<LibraryItemStatus, string> = {
  quero_consumir: "Quero consumir",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  abandonado: "Abandonado",
};

const STATUS_TONE: Record<LibraryItemStatus, BadgeTone> = {
  quero_consumir: "info",
  em_andamento: "warning",
  concluido: "success",
  pausado: "info",
  abandonado: "error",
};

const NEXT_STATUS: Record<LibraryItemStatus, LibraryItemStatus> = {
  quero_consumir: "em_andamento",
  em_andamento: "concluido",
  concluido: "quero_consumir",
  pausado: "em_andamento",
  abandonado: "quero_consumir",
};

/** "A única visualização do acervo é Galeria." Grade de cards, sem Lista/Tabela/Kanban paralelos. */
export function GalleryGrid({
  items,
  onAdvanceStatus,
  onToggleFavorite,
  onDelete,
}: {
  items: LibraryItem[];
  onAdvanceStatus: (itemId: string, status: LibraryItemStatus) => void;
  onToggleFavorite: (itemId: string, isFavorite: boolean) => void;
  onDelete: (itemId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmItem = items.find((item) => item.id === confirmDeleteId) ?? null;

  if (items.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Sua Biblioteca está vazia.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
      {items.map((item) => {
        const progress = computeProgressPercent(item);
        return (
          <Card key={item.id}>
            {item.cover_url && (
              <img src={item.cover_url} alt="" className="w-full h-32 object-cover rounded-sm bg-surface-1" />
            )}
            <p className="font-display text-sm font-semibold text-text-primary line-clamp-2">
              {item.is_favorite && "★ "}
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-sans text-xs text-text-secondary-warm">
                {LIBRARY_ITEM_TYPE_LABELS[item.item_type]}
                {item.year ? ` · ${item.year}` : ""}
              </span>
              <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            </div>
            {progress !== null && (
              <div className="w-full h-1 bg-surface-1 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan" style={{ width: `${progress}%` }} />
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="chip" onClick={() => onAdvanceStatus(item.id, NEXT_STATUS[item.status])}>
                {STATUS_LABEL[NEXT_STATUS[item.status]]}
              </Button>
              <Button type="button" variant="chip" onClick={() => onToggleFavorite(item.id, !item.is_favorite)}>
                {item.is_favorite ? "Desfavoritar" : "Favoritar"}
              </Button>
              <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(item.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        );
      })}
      <ConfirmDialog
        isOpen={confirmItem !== null}
        title={`Excluir "${confirmItem?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmItem) onDelete(confirmItem.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
