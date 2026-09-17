import { useRef } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState } from "@qqorvex/ui";
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
    <div className="qv-row px-[18px] py-[14px] flex flex-col gap-3 bg-[rgba(67,185,210,.04)]">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-semibold truncate">Versões de {document.file_name}</span>
          <span className="font-mono text-xs text-text-muted">atual: v{document.current_version}</span>
        </div>
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
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadNewVersion.isPending}
        >
          {uploadNewVersion.isPending ? "Enviando..." : "Enviar nova versão"}
        </Button>
        <button type="button" onClick={onClose} className="qv-icon-btn" aria-label="Fechar versões">
          ✕
        </button>
      </div>

      {isLoading ? (
        <EmptyState>Carregando histórico...</EmptyState>
      ) : versions.length === 0 ? (
        <EmptyState>Nenhuma versão anterior ainda. Ao enviar uma nova versão, a atual fica guardada aqui.</EmptyState>
      ) : (
        <ul className="qv-well flex flex-col">
          {versions.map((version) => (
            <li key={version.id} className="qv-row flex items-center gap-3 px-[14px] py-[10px]">
              <span className="font-mono text-xs text-text-secondary shrink-0">v{version.version_number}</span>
              <span className="flex-1 min-w-0 text-[13px] truncate">{version.file_name}</span>
              <span className="font-mono text-xs text-text-muted shrink-0">
                {new Date(version.created_at).toLocaleDateString("pt-BR")}
              </span>
              <Button
                type="button"
                variant="quiet"
                size="xs"
                onClick={() => restoreVersion.mutate({ document, version })}
                disabled={restoreVersion.isPending}
              >
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
