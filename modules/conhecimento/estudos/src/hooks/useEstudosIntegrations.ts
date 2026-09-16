import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createEventForAssessment,
  listRelatedLibraryItems,
  relateLibraryItem,
  unrelateLibraryItem,
} from "../repository";
import type { Assessment } from "../types";

const relatedLibraryItemsKey = (notebookId: string) => ["notebook-library-items", notebookId] as const;

export function useCreateEventForAssessment(client: SupabaseClient<Database>, userId: string) {
  return useMutation({
    mutationFn: (assessment: Assessment) => createEventForAssessment(client, userId, assessment),
  });
}

export function useRelatedLibraryItems(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({
    queryKey: relatedLibraryItemsKey(notebookId),
    queryFn: () => listRelatedLibraryItems(client, notebookId),
  });
  return { libraryItems: query.data ?? [], isLoading: query.isLoading };
}

export function useRelateLibraryItem(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (libraryItemId: string) => relateLibraryItem(client, notebookId, libraryItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relatedLibraryItemsKey(notebookId) }),
  });
}

export function useUnrelateLibraryItem(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (libraryItemId: string) => unrelateLibraryItem(client, notebookId, libraryItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: relatedLibraryItemsKey(notebookId) }),
  });
}
