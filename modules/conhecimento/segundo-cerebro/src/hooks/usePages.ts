import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { archivePage, createPage, deletePage, getOrCreateDailyNote, listAllPageLinks, listAllPageTags, listArchivedPages, listPages, updatePageFavorite, updatePageTitle } from "../repository";
import type { NewPageInput } from "../types";

const PAGES_KEY = ["sc-pages"] as const;
const ALL_PAGE_LINKS_KEY = ["sc-all-page-links"] as const;
const ARCHIVED_PAGES_KEY = ["sc-archived-pages"] as const;
const ALL_PAGE_TAGS_KEY = ["sc-all-page-tags"] as const;

export function usePages(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: PAGES_KEY, queryFn: () => listPages(client) });
  return { pages: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useArchivedPages(client: SupabaseClient<Database>, enabled = true) {
  const query = useQuery({ queryKey: ARCHIVED_PAGES_KEY, queryFn: () => listArchivedPages(client), enabled });
  return { pages: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreatePage(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPageInput) => createPage(client, userId, input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PAGES_KEY }),
    ]),
  });
}

export function useUpdatePageFavorite(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, isFavorite }: { pageId: string; isFavorite: boolean }) => updatePageFavorite(client, pageId, isFavorite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
  });
}

export function useUpdatePageTitle(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, title }: { pageId: string; title: string }) => updatePageTitle(client, pageId, title),
    onSuccess: (page) => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sc-page", page.id] }),
      queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
    ]),
  });
}

export function useArchivePage(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, isArchived }: { pageId: string; isArchived: boolean }) =>
      archivePage(client, pageId, isArchived),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PAGES_KEY }),
    ]),
  });
}

export function useDeletePage(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage(client, pageId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PAGES_KEY }),
    ]),
  });
}

export function useEnsureDailyNote(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: Date) => getOrCreateDailyNote(client, userId, date),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: PAGES_KEY }),
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PAGES_KEY }),
    ]),
  });
}

export function useAllPageLinks(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ALL_PAGE_LINKS_KEY, queryFn: () => listAllPageLinks(client) });
  return { links: query.data ?? [], isLoading: query.isLoading };
}

export function useAllPageTags(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ALL_PAGE_TAGS_KEY, queryFn: () => listAllPageTags(client) });
  return { tags: query.data ?? [], isLoading: query.isLoading };
}
