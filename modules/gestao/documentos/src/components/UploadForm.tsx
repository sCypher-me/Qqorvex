import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { DuplicateDocumentError } from "../repository";
import { DOCUMENT_TYPE_LABELS } from "../service";
import type { DocumentType, Folder } from "../types";

/**
 * "Upload deve mostrar progresso e estado de falha/retry." Se o arquivo já existir (mesmo hash),
 * pede confirmação explícita antes de enviar mesmo assim — mesmo padrão de conflito da Agenda.
 * Visual: dropzone tracejada do Design System — aceita arrastar e soltar ou clicar para escolher.
 */
export function UploadForm({
  onUpload,
  isUploading,
  folders = [],
  folderId = "",
  onFolderChange,
}: {
  onUpload: (file: File, documentType: DocumentType, options?: { force?: boolean; folderId?: string }) => Promise<void>;
  isUploading: boolean;
  folders?: Folder[];
  folderId?: string;
  onFolderChange?: (folderId: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ file: File; documentType: DocumentType; folderId: string; message: string } | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const typeSelect = form.elements.namedItem("documentType") as HTMLSelectElement;
    const file = input.files?.[0];
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    const documentType = typeSelect.value as DocumentType;
    setError(null);
    setDuplicate(null);
    try {
      await onUpload(file, documentType, { folderId: folderId || undefined });
      form.reset();
      setSelectedFileName(null);
    } catch (err) {
      if (err instanceof DuplicateDocumentError) {
        setDuplicate({ file, documentType, folderId, message: err.message });
        return;
      }
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  async function handleUploadAnyway() {
    if (!duplicate) return;
    try {
      await onUpload(duplicate.file, duplicate.documentType, { force: true, folderId: duplicate.folderId || undefined });
      setDuplicate(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading || !fileInputRef.current || event.dataTransfer.files.length === 0) return;
    fileInputRef.current.files = event.dataTransfer.files;
    setSelectedFileName(event.dataTransfer.files[0]?.name ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-5 transition-colors ${
          isDragging ? "border-gold bg-gold-soft" : "border-line-strong bg-canvas/40 hover:border-gold-line"
        }`}
      >
        <input
          ref={fileInputRef}
          id="document-upload-file"
          type="file"
          name="file"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
        />
        <label htmlFor="document-upload-file" className="flex-1 min-w-[220px] flex flex-col gap-1 cursor-pointer">
          <span className="text-[15px] font-semibold text-fg truncate">
            {selectedFileName ?? "Arraste um arquivo ou selecione do computador"}
          </span>
          <span className="text-[13px] text-fg-2">
            {selectedFileName
              ? "Arquivo pronto. Escolha o tipo e envie — dá para corrigir o tipo depois."
              : "PDF, imagem ou documento. Você pode corrigir o tipo depois."}
          </span>
        </label>
        <select
          name="documentType"
          defaultValue="outro"
          disabled={isUploading}
          aria-label="Tipo do documento"
          data-size="sm" className="q-input w-auto"
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {folders.length > 0 && (
          <select
            value={folderId}
            onChange={(event) => onFolderChange?.(event.target.value)}
            disabled={isUploading}
            aria-label="Salvar na pasta"
            data-size="sm" className="q-input w-auto"
          >
            <option value="">Sem pasta</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        )}
        <Button type="submit" variant="primary" className="px-[18px]" disabled={isUploading}>
          {isUploading ? "Enviando..." : "Enviar"}
        </Button>
      </form>
      {error && (
        <Notice tone="error" title="O envio falhou">
          {error} Os documentos já enviados continuam intactos — tente de novo.
        </Notice>
      )}
      {duplicate && (
        <Notice
          tone="warning"
          title="Arquivo já existe"
          actions={
            <>
              <Button type="button" variant="secondary" size="sm" onClick={handleUploadAnyway}>
                Enviar mesmo assim
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDuplicate(null)}>
                Cancelar
              </Button>
            </>
          }
        >
          {duplicate.message}
        </Notice>
      )}
    </div>
  );
}
