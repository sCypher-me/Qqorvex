import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useToast } from "@qqorvex/ui";
import { nextProgressStep } from "../service";
import { addItemCreator, archiveItem, createItem, deleteItem, listArchivedItems, listItemCreators, listItems, replaceItemCreators, toggleFavorite, updateItem, updateItemReview, updateItemStatus, updateProgress } from "../repository";
import type { LibraryCoverChange, LibraryItem, LibraryItemEditInput, LibraryItemStatus, NewLibraryItemInput } from "../types";

const ITEMS_KEY = ["library-items"] as const;
const ARCHIVED_ITEMS_KEY = ["library-archived-items"] as const;
const creatorsKey = (itemId: string) => ["library-item-creators", itemId] as const;

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

/**
 * O "+1" rápido (Biblioteca e Hoje): aplica `nextProgressStep`, avisa com "Desfazer" (volta ao
 * progresso anterior) e, se o passo chegou ao fim, oferece "Marcar concluído". `start` tira um
 * item da fila ("Começar").
 */
export function useLibraryQuickStep(client: SupabaseClient<Database>) {
  const { toast } = useToast();
  const updateProgressMutation = useUpdateProgress(client);
  const updateStatusMutation = useUpdateItemStatus(client);

  function step(item: LibraryItem) {
    const next = nextProgressStep(item);
    if (!next || item.progress_mode === null) return;
    const previous = {
      mode: item.progress_mode === "percentual" ? ("percentual" as const) : ("numerico" as const),
      current: item.progress_current ?? 0,
      total: item.progress_total ?? undefined,
      unit: item.progress_unit ?? undefined,
    };
    updateProgressMutation.mutate(
      { itemId: item.id, progress: next.progress },
      {
        onSuccess: () => {
          if (next.finished) {
            toast({ title: `Você terminou “${item.title}”?`, tone: "success", action: { label: "Marcar concluído", onClick: () => updateStatusMutation.mutate({ itemId: item.id, status: "concluido" }) } });
            return;
          }
          toast({ title: `${next.label} em “${item.title}”`, action: { label: "Desfazer", onClick: () => updateProgressMutation.mutate({ itemId: item.id, progress: previous }) } });
        },
        onError: () => toast({ title: "Não foi possível registrar o progresso", tone: "danger" }),
      },
    );
  }

  function start(item: LibraryItem) {
    updateStatusMutation.mutate(
      { itemId: item.id, status: "em_andamento" },
      { onSuccess: () => toast({ title: `Começou “${item.title}”`, tone: "success" }) },
    );
  }

  return { step, start, isPending: updateProgressMutation.isPending || updateStatusMutation.isPending };
}

export function useItemCreators(client: SupabaseClient<Database>, itemId: string, enabled = true) {
  const query = useQuery({ queryKey: creatorsKey(itemId), queryFn: () => listItemCreators(client, itemId), enabled });
  return { creators: query.data ?? [], isLoading: query.isLoading };
}

/** Edita dados, capa e criadores do item numa ação só (o formulário de edição salva tudo junto). */
export function useUpdateLibraryItem(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, input, cover, creators }: { itemId: string; input: LibraryItemEditInput; cover?: LibraryCoverChange; creators?: string[] }) => {
      const item = await updateItem(client, userId, itemId, input, cover);
      if (creators) await replaceItemCreators(client, itemId, creators);
      return item;
    },
    onSuccess: (item) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_ITEMS_KEY }),
      queryClient.invalidateQueries({ queryKey: creatorsKey(item.id) }),
      queryClient.invalidateQueries({ queryKey: ["hoje"] }),
    ]),
  });
}
