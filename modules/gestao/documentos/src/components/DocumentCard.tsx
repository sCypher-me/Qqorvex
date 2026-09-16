import { useState } from "react";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import { DOCUMENT_TYPE_LABELS, isImageMimeType } from "../service";
import type { Document, DocumentType, Folder } from "../types";

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
}) {
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (isMasked) {
    return (
      <Card>
        <p className="font-sans text-sm text-text-secondary-warm">🔒 Documento no Cofre</p>
      </Card>
    );
  }

  const canExtractText = onExtractText && isImageMimeType(document.mime_type);

  return (
    <Card
      onClick={onFocus}
      className={isFocused ? "ring-2 ring-brand-cyan" : ""}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-sans text-sm text-text-primary">
            {document.is_important && "⭐ "}
            {document.is_vault && "🔒 "}
            {document.file_name}
          </p>
          <p className="font-sans text-xs text-text-secondary-warm">{document.mime_type ?? "arquivo"}</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <select
            value={document.document_type}
            onChange={(event) => onChangeType(event.target.value as DocumentType)}
            className="text-xs rounded-md border border-border bg-surface-1 px-1 py-1 text-text-primary"
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
            className="text-xs rounded-md border border-border bg-surface-1 px-1 py-1 text-text-primary"
          >
            <option value="">Sem pasta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="chip" onClick={onDownload}>
            Abrir
          </Button>
          <Button type="button" variant="chip" onClick={onToggleImportant}>
            {document.is_important ? "Desmarcar" : "Importante"}
          </Button>
          <Button type="button" variant="chip" onClick={onToggleVault}>
            {document.is_vault ? "Tirar do Cofre" : "Marcar no Cofre"}
          </Button>
          <Button type="button" variant="chip" onClick={onOpenVersions}>
            Versões {document.current_version > 1 ? `(v${document.current_version})` : ""}
          </Button>
          {canExtractText && (
            <Button
              type="button"
              variant="chip"
              onClick={(event) => {
                event.stopPropagation();
                if (document.extracted_text) {
                  setShowExtractedText((v) => !v);
                } else {
                  onExtractText!();
                }
              }}
              disabled={isExtractingText}
            >
              {isExtractingText
                ? `Extraindo... ${extractProgress ?? 0}%`
                : document.extracted_text
                  ? showExtractedText
                    ? "Ocultar texto"
                    : "Ver texto extraído"
                  : "Extrair texto"}
            </Button>
          )}
          <Button
            type="button"
            variant="chip"
            onClick={(event) => {
              event.stopPropagation();
              setConfirmOpen(true);
            }}
          >
            Excluir
          </Button>
        </div>
      </div>
      {showExtractedText && document.extracted_text && (
        <div className="bg-surface-1 border border-border rounded-md p-2 flex flex-col gap-2">
          <p className="font-sans text-xs text-text-primary whitespace-pre-wrap">{document.extracted_text}</p>
          <Button
            type="button"
            variant="chip"
            className="self-start"
            onClick={(event) => {
              event.stopPropagation();
              navigator.clipboard.writeText(document.extracted_text!);
            }}
          >
            Copiar texto
          </Button>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${document.file_name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
