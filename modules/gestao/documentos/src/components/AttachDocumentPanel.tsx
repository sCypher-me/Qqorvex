import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useDocuments } from "../hooks/useDocumentos";
import { useRelatedDocuments, useAttachDocument, useDetachDocument } from "../hooks/useDocumentRelations";

/**
 * Painel reutilizável para qualquer módulo relacionar documentos a uma de suas entidades sem
 * conhecer os internals de Documentos — só a API pública. "Documentos é dono do arquivo; o
 * módulo relacionado mantém somente ID/referência. Remover uma relação não apaga o arquivo."
 */
export function AttachDocumentPanel({
  client,
  relatedModule,
  relatedEntityId,
}: {
  client: SupabaseClient<Database>;
  relatedModule: string;
  relatedEntityId: string;
}) {
  const { documents: allDocuments } = useDocuments(client);
  const { documents: attached, isLoading } = useRelatedDocuments(client, relatedModule, relatedEntityId);
  const attach = useAttachDocument(client, relatedModule, relatedEntityId);
  const detach = useDetachDocument(client, relatedModule, relatedEntityId);
  const [selectedId, setSelectedId] = useState("");

  const attachedIds = new Set(attached.map((d) => d.id));
  const attachableDocuments = allDocuments.filter((d) => !attachedIds.has(d.id));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-sm font-semibold text-text-secondary-warm">Documentos relacionados</h3>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : attached.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum documento relacionado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {attached.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-sm text-text-primary">
              <span>{doc.file_name}</span>
              <Button type="button" variant="chip" onClick={() => detach.mutate(doc.id)}>
                Remover relação
              </Button>
            </li>
          ))}
        </ul>
      )}

      {attachableDocuments.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Relacionar um documento...</option>
            {attachableDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!selectedId) return;
              attach.mutate(selectedId);
              setSelectedId("");
            }}
          >
            Relacionar
          </Button>
        </div>
      )}
    </div>
  );
}
