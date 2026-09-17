import { useState } from "react";
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
      <div className="qv-row flex items-center gap-[14px] px-[18px] py-[14px]" aria-label="Documento no Cofre">
        <ExtThumb label={documentExtension(document)} />
        <div className="flex-[1_1_140px] min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-medium truncate blur-[5px] select-none" aria-hidden="true">
            Documento protegido
          </span>
          <span className="font-mono text-xs text-text-muted truncate">documento do cofre</span>
        </div>
        <span className="qv-pill qv-pill-warning shrink-0">Cofre</span>
        <span className="font-mono text-xs whitespace-nowrap shrink-0 text-right text-warning">bloqueado</span>
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
    <div className={`qv-row flex flex-col ${isFocused ? "bg-[rgba(67,185,210,.05)]" : ""}`}>
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
        className="flex items-center gap-[14px] px-[18px] py-[14px] cursor-pointer hover:bg-white/[.02] outline-none focus-visible:bg-white/[.03]"
      >
        <ExtThumb label={documentExtension(document)} active={isFocused} />
        <div className="flex-[1_1_140px] min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-medium truncate text-text-primary">
            {document.is_important && (
              <span className="text-warning mr-1.5" title="Importante">
                ★
              </span>
            )}
            {document.file_name}
          </span>
          <span className="font-mono text-xs text-text-muted truncate">{meta}</span>
        </div>
        <span className={`qv-pill shrink-0 ${document.is_vault ? "qv-pill-warning" : ""}`}>
          {document.is_vault ? "Cofre" : DOCUMENT_TYPE_LABELS[document.document_type]}
        </span>
        <span
          className="font-mono text-xs whitespace-nowrap shrink-0 text-right"
          style={{ color: due?.color ?? "var(--color-text-muted)" }}
        >
          {due?.label ?? "—"}
        </span>
      </div>

      {isFocused && (
        <div className="px-[18px] pb-4 flex flex-col gap-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={document.document_type}
              onChange={(event) => onChangeType(event.target.value as DocumentType)}
              aria-label="Tipo do documento"
              className="qv-field w-auto py-[7px] px-3 text-[13px]"
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
              className="qv-field w-auto py-[7px] px-3 text-[13px]"
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
            <div className="qv-well p-3 flex flex-col gap-2">
              <p className="text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap">{document.extracted_text}</p>
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

function ExtThumb({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`w-[34px] h-[42px] shrink-0 rounded-[6px] border bg-vex-obsidian flex items-center justify-center font-mono text-[10px] ${
        active ? "border-vex-cyan-dark text-vex-cyan-bright" : "border-border text-text-muted"
      }`}
    >
      {label}
    </span>
  );
}
