import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import { DuplicateDocumentError } from "../repository";
import { DOCUMENT_TYPE_LABELS } from "../service";
import type { DocumentType } from "../types";

/**
 * "Upload deve mostrar progresso e estado de falha/retry." Se o arquivo já existir (mesmo hash),
 * pede confirmação explícita antes de enviar mesmo assim — mesmo padrão de conflito da Agenda.
 */
export function UploadForm({
  onUpload,
  isUploading,
}: {
  onUpload: (file: File, documentType: DocumentType, options?: { force?: boolean }) => Promise<void>;
  isUploading: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ file: File; documentType: DocumentType; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const typeSelect = event.currentTarget.elements.namedItem("documentType") as HTMLSelectElement;
    const file = input.files?.[0];
    if (!file) return;
    const documentType = typeSelect.value as DocumentType;
    setError(null);
    setDuplicate(null);
    try {
      await onUpload(file, documentType);
      event.currentTarget.reset();
    } catch (err) {
      if (err instanceof DuplicateDocumentError) {
        setDuplicate({ file, documentType, message: err.message });
        return;
      }
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  async function handleUploadAnyway() {
    if (!duplicate) return;
    try {
      await onUpload(duplicate.file, duplicate.documentType, { force: true });
      setDuplicate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="file"
          name="file"
          className="flex-1 text-sm text-text-primary"
          disabled={isUploading}
        />
        <select
          name="documentType"
          defaultValue="outro"
          disabled={isUploading}
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" disabled={isUploading}>
          {isUploading ? "Enviando..." : "Adicionar arquivo"}
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {duplicate && (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex flex-col gap-2">
          <p className="text-sm text-warning">{duplicate.message}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleUploadAnyway}>
              Enviar mesmo assim
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDuplicate(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
