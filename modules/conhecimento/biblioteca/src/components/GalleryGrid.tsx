import { useState } from "react";
import { Button, ConfirmDialog, EmptyState } from "@qqorvex/ui";
import { computeProgressPercent, LIBRARY_ITEM_TYPE_LABELS } from "../service";
import type { LibraryItem, LibraryItemStatus } from "../types";

const STATUS_LABEL: Record<LibraryItemStatus, string> = {
  quero_consumir: "Quero consumir",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  abandonado: "Abandonado",
};

/** Pílula de status sobre a capa: neutro = ainda não começou, cyan = ativo, verde/âmbar/vermelho = estado. */
const STATUS_PILL: Record<LibraryItemStatus, string> = {
  quero_consumir: "",
  em_andamento: "qv-pill-info",
  concluido: "qv-pill-success",
  pausado: "qv-pill-warning",
  abandonado: "qv-pill-danger",
};

const NEXT_STATUS: Record<LibraryItemStatus, LibraryItemStatus> = {
  quero_consumir: "em_andamento",
  em_andamento: "concluido",
  concluido: "quero_consumir",
  pausado: "em_andamento",
  abandonado: "quero_consumir",
};

/** Gradientes escuros de capa do design — usados quando o item não tem imagem de capa. */
const COVER_TINTS = ["#1E232B", "#2a2118", "#16222a", "#1b2430", "#2b1f2a", "#241d17", "#17252a", "#20262f"];

function coverGradient(itemId: string): string {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) | 0;
  }
  return `linear-gradient(150deg, ${COVER_TINTS[Math.abs(hash) % COVER_TINTS.length]}, #0f1216)`;
}

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
    return <EmptyState>Sua Biblioteca está vazia. Adicione um livro, filme, série ou jogo para começar.</EmptyState>;
  }

  return (
    <div className="grid gap-4 w-full [grid-template-columns:repeat(auto-fill,minmax(184px,1fr))]">
      {items.map((item) => {
        const progress = computeProgressPercent(item);
        const typeLabel = LIBRARY_ITEM_TYPE_LABELS[item.item_type];
        const nextStatus = NEXT_STATUS[item.status];
        return (
          <div
            key={item.id}
            className="qv-card overflow-hidden flex flex-col transition-[transform,border-color] duration-150 hover:-translate-y-[3px] hover:border-text-muted"
          >
            <div
              className="relative aspect-[2/3] flex items-end p-3"
              style={{ background: coverGradient(item.id) }}
            >
              {item.cover_url && (
                <>
                  <img src={item.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 28%, transparent 62%, rgba(0,0,0,.72) 100%)" }}
                  />
                </>
              )}
              <span className={`qv-pill ${STATUS_PILL[item.status]} absolute top-2.5 left-2.5`}>
                {STATUS_LABEL[item.status]}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorite(item.id, !item.is_favorite)}
                aria-pressed={item.is_favorite}
                aria-label={item.is_favorite ? `Desfavoritar ${item.title}` : `Favoritar ${item.title}`}
                title={item.is_favorite ? "Desfavoritar" : "Favoritar"}
                className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[13px] transition-colors ${
                  item.is_favorite ? "text-vex-gold" : "text-[#3a4049] hover:text-text-muted"
                }`}
              >
                ★
              </button>
              <span className="relative font-mono text-[11px] text-text-secondary">
                {typeLabel}
                {item.year ? ` · ${item.year}` : ""}
              </span>
            </div>

            <div className="p-3 flex flex-col gap-1 flex-1">
              <span className="text-sm font-semibold leading-[1.3] text-text-primary line-clamp-2">{item.title}</span>
              {item.subtitle && <span className="text-xs text-text-muted line-clamp-1">{item.subtitle}</span>}
              {progress !== null && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="qv-progress flex-1 h-1">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-text-muted">{progress}%</span>
                </div>
              )}
              <span className="flex-1" />
              <div className="flex items-center gap-1.5 mt-2">
                <Button
                  type="button"
                  variant="quiet"
                  size="xs"
                  className="flex-1 min-w-0"
                  title={`Mudar status para ${STATUS_LABEL[nextStatus]}`}
                  onClick={() => onAdvanceStatus(item.id, nextStatus)}
                >
                  <span className="truncate">→ {STATUS_LABEL[nextStatus]}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="qv-icon-btn w-[26px] h-[26px] shrink-0"
                  aria-label={`Excluir ${item.title}`}
                  title="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <ConfirmDialog
        isOpen={confirmItem !== null}
        title={`Excluir "${confirmItem?.title}"?`}
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmItem) onDelete(confirmItem.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
