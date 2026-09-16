import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { archivePage, createPage, deletePage, getOrCreateDailyNote, listAllPageLinks, listPages } from "../repository";
import type { NewPageInput } from "../types";

const PAGES_KEY = ["sc-pages"] as const;
const ALL_PAGE_LINKS_KEY = ["sc-all-page-links"] as const;

export function usePages(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PAGES_KEY, queryFn: () => listPages(client) });
  return { pages: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreatePage(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPageInput) => createPage(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
  });
}

export function useArchivePage(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, isArchived }: { pageId: string; isArchived: boolean }) =>
      archivePage(client, pageId, isArchived),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
  });
}

export function useDeletePage(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage(client, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
  });
}

export function useEnsureDailyNote(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: Date) => getOrCreateDailyNote(client, userId, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
  });
}

export function useAllPageLinks(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ALL_PAGE_LINKS_KEY, queryFn: () => listAllPageLinks(client) });
  return { links: query.data ?? [], isLoading: query.isLoading };
}
