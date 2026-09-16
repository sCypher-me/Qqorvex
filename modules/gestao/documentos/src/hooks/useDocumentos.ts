import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createFolder,
  createWarranty,
  deleteDocument,
  deleteFolder,
  listDocuments,
  listDocumentVersions,
  listFolders,
  listTrashedDocuments,
  listWarranties,
  moveDocumentToFolder,
  purgeDocument,
  restoreDocument,
  restoreDocumentVersion,
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

export function useDocuments(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: DOCUMENTS_KEY, queryFn: () => listDocuments(client) });
  return { documents: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useUploadDocument(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      fileName,
      documentType,
      force,
    }: {
      file: File;
      fileName: string;
      documentType?: Document["document_type"];
      force?: boolean;
    }) => uploadDocument(client, userId, file, fileName, documentType ?? "outro", { force }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRASHED_DOCUMENTS_KEY }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
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
