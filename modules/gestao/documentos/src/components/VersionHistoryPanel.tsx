import { useRef } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useDocumentVersions, useRestoreDocumentVersion, useUploadNewVersion } from "../hooks/useDocumentos";
import type { Document } from "../types";

/** "Reenviar um arquivo arquiva o estado anterior" — histórico de versões com restauração simétrica (v20260909000020). */
export function VersionHistoryPanel({
  client,
  document,
  onClose,
}: {
  client: SupabaseClient<Database>;
  document: Document;
  onClose: () => void;
}) {
  const { versions, isLoading } = useDocumentVersions(client, document.id);
  const restoreVersion = useRestoreDocumentVersion(client);
  const uploadNewVersion = useUploadNewVersion(client);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-text-primary">
          Versões de {document.file_name} (atual: v{document.current_version})
        </p>
        <button type="button" onClick={onClose} className="text-xs text-text-secondary-warm hover:text-text-primary">
          Fechar
        </button>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            uploadNewVersion.mutate({ document, file, fileName: file.name });
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadNewVersion.isPending}
          className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
        >
          {uploadNewVersion.isPending ? "Enviando..." : "Enviar nova versão"}
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando histórico...</p>
      ) : versions.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma versão anterior ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((version) => (
            <li key={version.id} className="border border-border rounded-md p-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-sm text-text-primary">
                  v{version.version_number} — {version.file_name}
                </p>
                <p className="font-sans text-xs text-text-secondary-warm">{version.created_at.slice(0, 10)}</p>
              </div>
              <button
                type="button"
                onClick={() => restoreVersion.mutate({ document, version })}
                disabled={restoreVersion.isPending}
                className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
