import { useRef } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState, SkeletonList } from "@qqorvex/ui";
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
    <div className="border-b border-line-soft last:border-b-0 px-[18px] py-[14px] flex flex-col gap-3 bg-gold-soft">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span className="text-sm font-semibold truncate">Versões de {document.file_name}</span>
          <span className="font-mono text-xs text-fg-3">atual: v{document.current_version}</span>
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
        <button type="button" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40" aria-label="Fechar versões">
          ✕
        </button>
      </div>

      {isLoading ? (
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40">
          <SkeletonList rows={2} subtitle={false} className="px-[14px] py-2.5" />
        </div>
      ) : versions.length === 0 ? (
        <EmptyState>Nenhuma versão anterior ainda. Ao enviar uma nova versão, a atual fica guardada aqui.</EmptyState>
      ) : (
        <ul className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex flex-col">
          {versions.map((version) => (
            <li key={version.id} className="border-b border-line-soft last:border-b-0 flex items-center gap-3 px-[14px] py-[10px]">
              <span className="font-mono text-xs text-fg-2 shrink-0">v{version.version_number}</span>
              <span className="flex-1 min-w-0 text-[13px] truncate">{version.file_name}</span>
              <span className="font-mono text-xs text-fg-3 shrink-0">
                {new Date(version.created_at).toLocaleDateString("pt-BR")}
              </span>
              <Button
                type="button"
                variant="ghost"
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
