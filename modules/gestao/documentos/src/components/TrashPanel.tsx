import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import { useRestoreDocument, usePurgeDocument, useTrashedDocuments } from "../hooks/useDocumentos";
import { daysUntilTrashExpiry } from "../service";

/** "Lixeira própria com retenção" — documentos excluídos ficam aqui, recuperáveis, até o prazo expirar. */
export function TrashPanel({ client }: { client: SupabaseClient<Database> }) {
  const { documents, isLoading } = useTrashedDocuments(client);
  const restore = useRestoreDocument(client);
  const purge = usePurgeDocument(client);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const confirmDocument = documents.find((d) => d.id === confirmPurgeId) ?? null;

  if (isLoading) return <p className="font-sans text-sm text-text-secondary-warm">Carregando lixeira...</p>;
  if (documents.length === 0) return <p className="font-sans text-sm text-text-secondary-warm">Lixeira vazia.</p>;

  const today = new Date();

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((document) => (
        <li key={document.id}>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-sm text-text-primary">{document.file_name}</p>
                <p className="font-sans text-xs text-text-secondary-warm">
                  Excluído em {document.deleted_at?.slice(0, 10)} · some em{" "}
                  {daysUntilTrashExpiry(document.deleted_at!, today)} {daysUntilTrashExpiry(document.deleted_at!, today) === 1 ? "dia" : "dias"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="chip" onClick={() => restore.mutate(document.id)}>
                  Restaurar
                </Button>
                <Button type="button" variant="chip" onClick={() => setConfirmPurgeId(document.id)}>
                  Excluir para sempre
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
      <ConfirmDialog
        isOpen={confirmDocument !== null}
        title={`Excluir "${confirmDocument?.file_name}" para sempre?`}
        description="Essa ação não pode ser desfeita — o arquivo é removido definitivamente."
        onConfirm={() => {
          if (confirmDocument) purge.mutate(confirmDocument);
          setConfirmPurgeId(null);
        }}
        onCancel={() => setConfirmPurgeId(null)}
      />
    </ul>
  );
}
