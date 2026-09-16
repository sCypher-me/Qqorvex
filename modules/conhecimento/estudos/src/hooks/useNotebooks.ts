import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createNotebook, deleteNotebook, listNotebooks } from "../repository";
import type { NewNotebookInput } from "../types";

const NOTEBOOKS_KEY = ["notebooks"] as const;

export function useNotebooks(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: NOTEBOOKS_KEY, queryFn: () => listNotebooks(client) });
  return { notebooks: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateNotebook(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewNotebookInput) => createNotebook(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTEBOOKS_KEY }),
  });
}

export function useDeleteNotebook(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => deleteNotebook(client, notebookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTEBOOKS_KEY }),
  });
}
