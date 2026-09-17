import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState } from "@qqorvex/ui";
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
    <div className="flex flex-col gap-[10px]">
      <span className="qv-eyebrow">Documentos relacionados</span>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : attached.length === 0 ? (
        <EmptyState>Nenhum documento relacionado.</EmptyState>
      ) : (
        <ul className="qv-well flex flex-col">
          {attached.map((doc) => (
            <li key={doc.id} className="qv-row flex items-center gap-3 px-3 py-[9px]">
              <span className="w-[26px] h-[32px] shrink-0 rounded-[5px] border border-border bg-vex-obsidian flex items-center justify-center font-mono text-[9px] text-text-muted">
                {documentExtension(doc)}
              </span>
              <span className="flex-1 min-w-0 text-[13px] truncate">{doc.file_name}</span>
              <Button type="button" variant="quiet" size="xs" onClick={() => detach.mutate(doc.id)}>
                Remover relação
              </Button>
            </li>
          ))}
        </ul>
      )}

      {attachableDocuments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Documento para relacionar"
            className="qv-field flex-[1_1_200px] py-[7px] px-3 text-[13px]"
          >
            <option value="">Relacionar um documento...</option>
            {attachableDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!selectedId}
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
