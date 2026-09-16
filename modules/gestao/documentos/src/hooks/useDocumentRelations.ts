import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { addDocumentRelation, listRelatedDocuments, removeDocumentRelationByEntity } from "../repository";

const relatedDocumentsKey = (relatedModule: string, relatedEntityId: string) =>
  ["related-documents", relatedModule, relatedEntityId] as const;

/**
 * Hook genérico de integração cross-module: "quais documentos estão relacionados a esta
 * entidade" (uma movimentação de Finanças, um Caderno de Estudos, etc.). Qualquer módulo pode
 * usar isto sem conhecer os internals de Documentos — só a API pública.
 */
export function useRelatedDocuments(client: SupabaseClient<Database>, relatedModule: string, relatedEntityId: string) {
  const query = useQuery({
    queryKey: relatedDocumentsKey(relatedModule, relatedEntityId),
    queryFn: () => listRelatedDocuments(client, relatedModule, relatedEntityId),
    enabled: !!relatedEntityId,
  });
  return { documents: query.data ?? [], isLoading: query.isLoading };
}

export function useAttachDocument(client: SupabaseClient<Database>, relatedModule: string, relatedEntityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => addDocumentRelation(client, documentId, relatedModule, relatedEntityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relatedDocumentsKey(relatedModule, relatedEntityId) }),
  });
}

export function useDetachDocument(client: SupabaseClient<Database>, relatedModule: string, relatedEntityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => removeDocumentRelationByEntity(client, documentId, relatedModule, relatedEntityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relatedDocumentsKey(relatedModule, relatedEntityId) }),
  });
}
