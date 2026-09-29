import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { addItemCreator, archiveItem, createItem, deleteItem, listArchivedItems, listItems, toggleFavorite, updateItemReview, updateItemStatus, updateProgress } from "../repository";
import type { LibraryItem, LibraryItemStatus, NewLibraryItemInput } from "../types";

const ITEMS_KEY = ["library-items"] as const;
const ARCHIVED_ITEMS_KEY = ["library-archived-items"] as const;

/** Aplica o item devolvido pelo servidor direto no cache (a tela responde na hora) e revalida. */
function applyUpdated(queryClient: QueryClient, updated: LibraryItem) {
  queryClient.setQueryData<LibraryItem[]>(ITEMS_KEY, (items) => items?.map((item) => (item.id === updated.id ? updated : item)));
  void queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
  void queryClient.invalidateQueries({ queryKey: ["hoje"] });
}

export function useLibraryItems(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ITEMS_KEY, queryFn: () => listItems(client) });
  return { items: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useArchivedLibraryItems(client: SupabaseClient<Database>, enabled = true) {
  const query = useQuery({ queryKey: ARCHIVED_ITEMS_KEY, queryFn: () => listArchivedItems(client), enabled });
  return { items: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateLibraryItem(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewLibraryItemInput) => createItem(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

/**
 * Cria o item e, se vier de uma busca de metadados (Google Books/TMDB), os autores/diretores
 * junto — `library_item_creators` nunca tinha uso real antes do Metadata Provider Layer.
 */
export function useCreateLibraryItemWithCreators(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, creators, coverFile }: { input: NewLibraryItemInput; creators?: { name: string; role: string }[]; coverFile?: File }) => {
      const item = await createItem(client, userId, input, coverFile);
      if (creators) {
        for (let i = 0; i < creators.length; i++) {
          await addItemCreator(client, item.id, creators[i]!.name, creators[i]!.role, i);
        }
      }
      return item;
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_ITEMS_KEY }),
    ]),
  });
}

export function useUpdateItemStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: LibraryItemStatus }) =>
      updateItemStatus(client, itemId, status),
    onSuccess: (updated) => applyUpdated(queryClient, updated),
  });
}

export function useUpdateProgress(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, progress }: { itemId: string; progress: { current: number; total?: number; mode: "numerico" | "percentual"; unit?: string } }) => updateProgress(client, itemId, progress),
    onSuccess: (updated) => applyUpdated(queryClient, updated),
  });
}

export function useUpdateItemReview(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, review }: { itemId: string; review: { rating: number | null; shortNote: string | null } }) => updateItemReview(client, itemId, review),
    onSuccess: (updated) => applyUpdated(queryClient, updated),
  });
}

export function useArchiveLibraryItem(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isArchived }: { itemId: string; isArchived: boolean }) => archiveItem(client, itemId, isArchived),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_ITEMS_KEY }),
    ]),
  });
}

export function useToggleFavorite(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) =>
      toggleFavorite(client, itemId, isFavorite),
    onSuccess: (updated) => applyUpdated(queryClient, updated),
  });
}

export function useDeleteLibraryItem(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteItem(client, itemId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_ITEMS_KEY }),
    ]),
  });
}
