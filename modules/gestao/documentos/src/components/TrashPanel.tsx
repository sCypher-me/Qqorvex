import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, ConfirmDialog, EmptyState } from "@qqorvex/ui";
import { useRestoreDocument, usePurgeDocument, useTrashedDocuments } from "../hooks/useDocumentos";
import { TRASH_RETENTION_DAYS, daysUntilTrashExpiry } from "../service";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** "Lixeira própria com retenção" — documentos excluídos ficam aqui, recuperáveis, até o prazo expirar. */
export function TrashPanel({ client }: { client: SupabaseClient<Database> }) {
  const { documents, isLoading } = useTrashedDocuments(client);
  const restore = useRestoreDocument(client);
  const purge = usePurgeDocument(client);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const confirmDocument = documents.find((d) => d.id === confirmPurgeId) ?? null;
  const today = new Date();

  return (
    <div className="qv-card overflow-hidden">
      <CardHeader
        divider
        title="Lixeira"
        meta={isLoading ? undefined : `${documents.length} ${documents.length === 1 ? "arquivo" : "arquivos"}`}
      />
      {isLoading ? (
        <EmptyState className="px-5 py-4">Carregando lixeira...</EmptyState>
      ) : documents.length === 0 ? (
        <EmptyState className="px-5 py-4">
          Lixeira vazia. Documentos excluídos ficam aqui por {TRASH_RETENTION_DAYS} dias antes de sumirem de vez.
        </EmptyState>
      ) : (
        <ul>
          {documents.map((document) => {
            const daysLeft = daysUntilTrashExpiry(document.deleted_at!, today);
            return (
              <li key={document.id} className="qv-row flex items-center gap-[14px] px-[18px] py-[14px] flex-wrap">
                <div className="flex-[1_1_180px] min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-medium truncate">{document.file_name}</span>
                  <span className="font-mono text-xs text-text-muted truncate">
                    excluído em {formatDate(document.deleted_at!)} · some em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="quiet" size="sm" onClick={() => restore.mutate(document.id)}>
                    Restaurar
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmPurgeId(document.id)}>
                    Excluir para sempre
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        isOpen={confirmDocument !== null}
        title={`Excluir "${confirmDocument?.file_name}" para sempre?`}
        description="Essa ação não pode ser desfeita — o arquivo é removido definitivamente."
        confirmLabel="Excluir para sempre"
        onConfirm={() => {
          if (confirmDocument) purge.mutate(confirmDocument);
          setConfirmPurgeId(null);
        }}
        onCancel={() => setConfirmPurgeId(null)}
      />
    </div>
  );
}
