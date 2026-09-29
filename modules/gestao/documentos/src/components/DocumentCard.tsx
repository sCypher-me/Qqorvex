import { useState } from "react";
import { LockIcon, StarIcon } from "@phosphor-icons/react";
import { Button, ConfirmDialog } from "@qqorvex/ui";
import { DOCUMENT_TYPE_LABELS, TRASH_RETENTION_DAYS, isImageMimeType } from "../service";
import type { Document, DocumentType, Folder } from "../types";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Extensão curta em caixa alta para a miniatura (ex.: "PDF", "JPG"). */
export function documentExtension(document: Pick<Document, "file_name" | "mime_type">): string {
  const fromName = document.file_name.includes(".") ? document.file_name.split(".").pop() : undefined;
  const fromMime = document.mime_type?.split("/").pop();
  const ext = (fromName || fromMime || "ARQ").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return ext.slice(0, 4) || "ARQ";
}

/** Tamanho em pt-BR: "480 KB", "1,2 MB". */
export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function DocumentCard({
  document,
  folders,
  onDownload,
  onToggleImportant,
  onToggleVault,
  onDelete,
  onOpenVersions,
  onMoveToFolder,
  onChangeType,
  onToggleArchive,
  isArchived = false,
  onExtractText,
  isExtractingText,
  extractProgress,
  isFocused,
  onFocus,
  isMasked,
  due,
}: {
  document: Document;
  folders: Folder[];
  onDownload: () => void;
  onToggleImportant: () => void;
  onToggleVault: () => void;
  onDelete: () => void;
  onOpenVersions: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onChangeType: (documentType: DocumentType) => void;
  onToggleArchive?: () => void;
  isArchived?: boolean;
  /** Presente só quando o mime type é imagem — PDF/outros formatos não oferecem OCR na v1. */
  onExtractText?: () => void;
  isExtractingText?: boolean;
  extractProgress?: number;
  isFocused?: boolean;
  onFocus?: () => void;
  /** `true` quando o documento está no Cofre e o Cofre ainda não foi desbloqueado nesta sessão de navegação. */
  isMasked?: boolean;
  /** Vencimento derivado (ex.: garantia vinculada) — texto curto + cor de estado. */
  due?: { label: string; color: string };
}) {
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isMasked) {
    return (
      <div className="border-b border-line-soft last:border-b-0 flex items-center gap-[14px] px-[18px] py-[14px]" aria-label="Documento no Cofre">
        <ExtThumb label={documentExtension(document)} />
        <div className="flex-[1_1_140px] min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-medium truncate blur-[5px] select-none" aria-hidden="true">
            Documento protegido
          </span>
          <span className="truncate text-xs text-fg-3">Desbloqueie o Cofre para ver</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
          <LockIcon size={11} weight="bold" /> Cofre
        </span>
      </div>
    );
  }

  const canExtractText = onExtractText && isImageMimeType(document.mime_type);
  const meta = [
    formatFileSize(document.size_bytes),
    document.current_version > 1 ? `${document.current_version} versões` : `enviado em ${formatShortDate(document.created_at)}`,
    document.extracted_text ? "texto extraído" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`border-b border-line-soft last:border-b-0 flex flex-col ${isFocused ? "bg-gold-soft" : ""}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isFocused}
        onClick={onFocus}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onFocus?.();
          }
        }}
        className="flex items-center gap-[14px] px-[18px] py-[14px] cursor-pointer hover:bg-hover outline-none focus-visible:bg-gold-soft"
      >
        <ExtThumb label={documentExtension(document)} active={isFocused} />
        <div className="flex-[1_1_140px] min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-medium truncate text-fg">
            {document.is_important && <StarIcon size={13} weight="fill" className="mr-1.5 inline -translate-y-px text-gold-fg" aria-label="Importante" />}
            {document.file_name}
          </span>
          <span className="truncate text-xs text-fg-3">{meta}</span>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${document.is_vault ? "bg-warning-soft text-warning" : "bg-hover text-fg-2"}`}>
          {document.is_vault ? "Cofre" : DOCUMENT_TYPE_LABELS[document.document_type]}
        </span>
        {due && (
          <span className="hidden shrink-0 whitespace-nowrap text-right text-xs sm:inline" style={{ color: due.color }}>
            {due.label}
          </span>
        )}
      </div>

      {isFocused && (
        <div className="px-[18px] pb-4 flex flex-col gap-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={document.document_type}
              onChange={(event) => onChangeType(event.target.value as DocumentType)}
              aria-label="Tipo do documento"
              className="q-input w-auto py-[7px] px-3 text-[13px]"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={document.folder_id ?? ""}
              onChange={(event) => onMoveToFolder(event.target.value || null)}
              aria-label="Pasta"
              className="q-input w-auto py-[7px] px-3 text-[13px]"
            >
              <option value="">Sem pasta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="primary" size="sm" onClick={onDownload}>
              Abrir
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={onToggleImportant}>
              {document.is_important ? "Desmarcar importante" : "Importante"}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={onToggleVault}>
              {document.is_vault ? "Tirar do Cofre" : "Marcar no Cofre"}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={onOpenVersions}>
              Versões
              {document.current_version > 1 && <span className="font-mono text-xs">v{document.current_version}</span>}
            </Button>
            {onToggleArchive && (
              <Button type="button" variant="quiet" size="sm" onClick={onToggleArchive}>
                {isArchived ? "Restaurar do arquivo" : "Arquivar"}
              </Button>
            )}
            {canExtractText && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => {
                  if (document.extracted_text) {
                    setShowExtractedText((v) => !v);
                  } else {
                    onExtractText!();
                  }
                }}
                disabled={isExtractingText}
              >
                {isExtractingText ? (
                  <>
                    Extraindo... <span className="font-mono text-xs">{extractProgress ?? 0}%</span>
                  </>
                ) : document.extracted_text ? (
                  showExtractedText ? (
                    "Ocultar texto"
                  ) : (
                    "Ver texto extraído"
                  )
                ) : (
                  "Extrair texto"
                )}
              </Button>
            )}
            <span className="flex-1" />
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              Excluir
            </Button>
          </div>
          {showExtractedText && document.extracted_text && (
            <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 p-3 flex flex-col gap-2">
              <p className="text-[13px] leading-relaxed text-fg whitespace-pre-wrap">{document.extracted_text}</p>
              <Button
                type="button"
                variant="quiet"
                size="xs"
                className="self-start"
                onClick={() => navigator.clipboard.writeText(document.extracted_text!)}
              >
                Copiar texto
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${document.file_name}"?`}
        description={`O arquivo vai para a lixeira e pode ser restaurado por ${TRASH_RETENTION_DAYS} dias.`}
        confirmLabel="Excluir documento"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

const EXT_COLOR: Record<string, string> = { PDF: "var(--q-danger)", JPG: "var(--q-info)", JPEG: "var(--q-info)", PNG: "var(--q-info)", WEBP: "var(--q-info)", HEIC: "var(--q-info)", DOC: "var(--q-cat-6)", DOCX: "var(--q-cat-6)", XLS: "var(--q-success)", XLSX: "var(--q-success)", CSV: "var(--q-success)" };

function ExtThumb({ label, active = false }: { label: string; active?: boolean }) {
  const color = EXT_COLOR[label] ?? "var(--q-fg-3)";
  return (
    <span
      className={`relative flex h-10 w-8 shrink-0 items-end justify-center overflow-hidden rounded-md border pb-1 font-mono text-[9px] font-semibold ${active ? "border-gold-line" : "border-line"}`}
      style={{ background: `color-mix(in srgb, ${color} 10%, var(--q-raised))`, color }}
    >
      <span aria-hidden="true" className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-[3px] border-b border-l border-line bg-canvas/60" />
      {label}
    </span>
  );
}
