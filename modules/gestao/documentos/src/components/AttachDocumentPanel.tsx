import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState, SkeletonList } from "@qqorvex/ui";
import { useDocuments } from "../hooks/useDocumentos";
import { useRelatedDocuments, useAttachDocument, useDetachDocument } from "../hooks/useDocumentRelations";
import { documentExtension } from "./DocumentCard";

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
      <h3 className="text-xs font-semibold text-fg-2">Documentos relacionados</h3>

      {isLoading ? (
        <div className="min-w-0 rounded-lg border border-line-soft bg-surface">
          <SkeletonList rows={2} subtitle={false} className="px-3 py-2" />
        </div>
      ) : attached.length === 0 ? (
        <EmptyState>Nenhum documento relacionado ainda.</EmptyState>
      ) : (
        <ul className="flex min-w-0 flex-col divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft bg-surface">
          {attached.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex h-8 w-[26px] shrink-0 items-center justify-center rounded-[5px] border border-line bg-raised font-mono text-[9px] font-semibold text-fg-3">
                {documentExtension(doc)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{doc.file_name}</span>
              <Button type="button" variant="ghost" size="xs" onClick={() => detach.mutate(doc.id)}>
                Desvincular
              </Button>
            </li>
          ))}
        </ul>
      )}

      {attachableDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Documento para relacionar"
            data-size="sm"
            className="q-input flex-[1_1_200px]"
          >
            <option value="">Vincular um documento…</option>
            {attachableDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!selectedId}
            onClick={() => {
              if (!selectedId) return;
              attach.mutate(selectedId);
              setSelectedId("");
            }}
          >
            Vincular
          </Button>
        </div>
      )}
    </div>
  );
}
