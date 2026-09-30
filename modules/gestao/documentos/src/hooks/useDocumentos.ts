import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  countVaultDocuments,
  createFolder,
  createWarranty,
  getVaultUnlockedUntil,
  lockVault,
  unlockVault,
  getDocumentStorageQuota,
  deleteDocument,
  deleteFolder,
  listDocuments,
  listDocumentVersions,
  listFolders,
  listTrashedDocuments,
  listWarranties,
  moveDocumentToFolder,
  purgeDocument,
  renameDocument,
  renameFolder,
  restoreDocument,
  restoreDocumentVersion,
  setDocumentArchived,
  toggleImportant,
  toggleVault,
  updateDocumentType,
  updateExtractedText,
  uploadDocument,
  uploadNewVersion,
} from "../repository";
import { extractTextFromImage } from "../ocr";
import type { Document, DocumentVersion } from "../types";

const DOCUMENTS_KEY = ["documents"] as const;
const FOLDERS_KEY = ["folders"] as const;
const WARRANTIES_KEY = ["warranties"] as const;
const TRASHED_DOCUMENTS_KEY = ["documents-trash"] as const;
const DOCUMENT_VERSIONS_KEY = ["document-versions"] as const;
const DOCUMENT_STORAGE_QUOTA_KEY = ["documents", "storage-quota"] as const;
const VAULT_STATUS_KEY = ["documents", "vault-status"] as const;

export function useDocumentStorageQuota(client: SupabaseClient<Database>) {
  const query = useQuery({
    queryKey: DOCUMENT_STORAGE_QUOTA_KEY,
    queryFn: () => getDocumentStorageQuota(client),
    retry: false,
  });
  return { quota: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useDocuments(client: SupabaseClient<Database>, archived = false, enabled = true) {
  const query = useQuery({ queryKey: [...DOCUMENTS_KEY, archived], queryFn: () => listDocuments(client, archived), enabled });
  return { documents: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useUploadDocument(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      fileName,
      documentType,
      force,
      folderId,
    }: {
      file: File;
      fileName: string;
      documentType?: Document["document_type"];
      force?: boolean;
      folderId?: string;
    }) => uploadDocument(client, userId, file, fileName, documentType ?? "outro", { force, folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_STORAGE_QUOTA_KEY });
    },
  });
}

export function useRenameDocument(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, fileName }: { documentId: string; fileName: string }) => renameDocument(client, documentId, fileName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useUpdateDocumentType(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, documentType }: { documentId: string; documentType: Document["document_type"] }) =>
      updateDocumentType(client, documentId, documentType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useDeleteDocument(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(client, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRASHED_DOCUMENTS_KEY });
    },
  });
}

export function useTrashedDocuments(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: TRASHED_DOCUMENTS_KEY, queryFn: () => listTrashedDocuments(client) });
  return { documents: query.data ?? [], isLoading: query.isLoading };
}

export function useRestoreDocument(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => restoreDocument(client, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRASHED_DOCUMENTS_KEY });
    },
  });
}

export function usePurgeDocument(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: Document) => purgeDocument(client, document),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRASHED_DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_STORAGE_QUOTA_KEY });
    },
  });
}

export function useDocumentVersions(client: SupabaseClient<Database>, documentId: string) {
  const query = useQuery({
    queryKey: [...DOCUMENT_VERSIONS_KEY, documentId],
    queryFn: () => listDocumentVersions(client, documentId),
    enabled: !!documentId,
  });
  return { versions: query.data ?? [], isLoading: query.isLoading };
}

export function useUploadNewVersion(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ document, file, fileName }: { document: Document; file: File; fileName: string }) =>
      uploadNewVersion(client, document, file, fileName),
    onSuccess: (_data, { document }) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...DOCUMENT_VERSIONS_KEY, document.id] });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_STORAGE_QUOTA_KEY });
    },
  });
}

export function useRestoreDocumentVersion(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ document, version }: { document: Document; version: DocumentVersion }) =>
      restoreDocumentVersion(client, document, version),
    onSuccess: (_data, { document }) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...DOCUMENT_VERSIONS_KEY, document.id] });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_STORAGE_QUOTA_KEY });
    },
  });
}

export function useToggleImportant(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, isImportant }: { documentId: string; isImportant: boolean }) =>
      toggleImportant(client, documentId, isImportant),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

/**
 * Roda o Tesseract.js sobre a imagem já publicamente acessível via signed URL e persiste o
 * resultado em `documents.extracted_text`. `onProgress` é repassado direto pro Tesseract, sem
 * passar pelo React Query — é só feedback visual do componente durante a mutation, não estado.
 */
export function useExtractText(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      imageUrl,
      onProgress,
    }: {
      documentId: string;
      imageUrl: string;
      onProgress?: (percent: number) => void;
    }) => {
      const text = await extractTextFromImage(imageUrl, onProgress);
      return updateExtractedText(client, documentId, text);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useToggleVault(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, isVault }: { documentId: string; isVault: boolean }) => toggleVault(client, documentId, isVault),
    // Prefixo "documents": recarrega a lista, a cota e o estado do Cofre (contagem).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

/**
 * Estado do Cofre nesta sessão: até quando está aberto (`null` = bloqueado) e quantos documentos
 * ele tem. Fica sob o prefixo "documents" para recarregar junto com a lista.
 */
export function useVaultStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: VAULT_STATUS_KEY,
    queryFn: async () => {
      const [unlockedUntil, count] = await Promise.all([getVaultUnlockedUntil(client), countVaultDocuments(client)]);
      return { unlockedUntil, count };
    },
  });
  const unlockedUntil = query.data?.unlockedUntil ?? null;

  // Quando o prazo acaba, o servidor já esconde o Cofre; recarregar faz a tela acompanhar na hora.
  useEffect(() => {
    if (!unlockedUntil) return;
    const remaining = new Date(unlockedUntil).getTime() - Date.now();
    const timer = window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }), Math.max(remaining, 0) + 500);
    return () => window.clearTimeout(timer);
  }, [unlockedUntil, queryClient]);

  return { unlockedUntil, count: query.data?.count ?? 0, isLoading: query.isLoading, error: query.error };
}

/** Desbloqueia com o PIN; em caso de sucesso a lista recarrega já com os documentos do Cofre. */
export function useUnlockVault(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) => unlockVault(client, pin),
    onSuccess: (unlockedUntil) => {
      if (unlockedUntil) void queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

/** "Bloquear agora" — e também usado quando o prazo de 15 minutos acaba. */
export function useLockVault(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => lockVault(client),
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useFolders(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: FOLDERS_KEY, queryFn: () => listFolders(client) });
  return { folders: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateFolder(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createFolder(client, userId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useRenameFolder(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) => renameFolder(client, folderId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useDeleteFolder(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(client, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useMoveDocumentToFolder(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, folderId }: { documentId: string; folderId: string | null }) =>
      moveDocumentToFolder(client, documentId, folderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useSetDocumentArchived(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, isArchived }: { documentId: string; isArchived: boolean }) =>
      setDocumentArchived(client, documentId, isArchived),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useWarranties(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: WARRANTIES_KEY, queryFn: () => listWarranties(client) });
  return { warranties: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateWarranty(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productName: string; purchaseDate: string; durationMonths: number; documentId?: string }) =>
      createWarranty(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WARRANTIES_KEY }),
  });
}
