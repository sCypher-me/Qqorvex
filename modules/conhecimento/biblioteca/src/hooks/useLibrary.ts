import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { addItemCreator, createItem, deleteItem, listItems, toggleFavorite, updateItemStatus } from "../repository";
import type { LibraryItemStatus, NewLibraryItemInput } from "../types";

const ITEMS_KEY = ["library-items"] as const;

export function useLibraryItems(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ITEMS_KEY, queryFn: () => listItems(client) });
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
    mutationFn: async ({ input, creators }: { input: NewLibraryItemInput; creators?: { name: string; role: string }[] }) => {
      const item = await createItem(client, userId, input);
      if (creators) {
        for (let i = 0; i < creators.length; i++) {
          await addItemCreator(client, item.id, creators[i]!.name, creators[i]!.role, i);
        }
      }
      return item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useUpdateItemStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: LibraryItemStatus }) =>
      updateItemStatus(client, itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useToggleFavorite(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) =>
      toggleFavorite(client, itemId, isFavorite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useDeleteLibraryItem(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteItem(client, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}
