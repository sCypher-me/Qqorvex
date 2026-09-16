import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addPageTag,
  createBlock,
  createBlockAfter,
  createCheckpoint,
  createPageLink,
  deleteBlock,
  getPage,
  listBacklinks,
  listBlocks,
  listCheckpoints,
  listPageTags,
  moveBlock,
  removePageTag,
  restoreCheckpoint,
  updateBlockContent,
  updateBlockType,
} from "../repository";
import type { BlockType, PageCheckpoint } from "../types";

const pageKey = (pageId: string) => ["sc-page", pageId] as const;
const blocksKey = (pageId: string) => ["sc-blocks", pageId] as const;
const tagsKey = (pageId: string) => ["sc-tags", pageId] as const;
const backlinksKey = (pageId: string) => ["sc-backlinks", pageId] as const;
const checkpointsKey = (pageId: string) => ["sc-checkpoints", pageId] as const;

export function usePage(client: SupabaseClient<Database>, pageId: string) {
  const query = useQuery({ queryKey: pageKey(pageId), queryFn: () => getPage(client, pageId) });
  return { page: query.data, isLoading: query.isLoading };
}

export function useBlocks(client: SupabaseClient<Database>, pageId: string) {
  const query = useQuery({ queryKey: blocksKey(pageId), queryFn: () => listBlocks(client, pageId) });
  return { blocks: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateBlock(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockType, content, orderIndex }: { blockType: BlockType; content: Record<string, unknown>; orderIndex: number }) =>
      createBlock(client, pageId, blockType, content, orderIndex),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function useCreateBlockAfter(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ afterBlockId, blockType, content }: { afterBlockId: string; blockType: BlockType; content: Record<string, unknown> }) =>
      createBlockAfter(client, pageId, afterBlockId, blockType, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function useDeleteBlock(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) => deleteBlock(client, blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function useUpdateBlockContent(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, content }: { blockId: string; content: Record<string, unknown> }) =>
      updateBlockContent(client, blockId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function useUpdateBlockType(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, blockType, content }: { blockId: string; blockType: BlockType; content: Record<string, unknown> }) =>
      updateBlockType(client, blockId, blockType, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function useMoveBlock(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, direction }: { blockId: string; direction: "up" | "down" }) => moveBlock(client, pageId, blockId, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksKey(pageId) }),
  });
}

export function usePageTags(client: SupabaseClient<Database>, pageId: string) {
  const query = useQuery({ queryKey: tagsKey(pageId), queryFn: () => listPageTags(client, pageId) });
  return { tags: query.data ?? [], isLoading: query.isLoading };
}

export function useAddPageTag(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => addPageTag(client, pageId, tag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagsKey(pageId) }),
  });
}

export function useRemovePageTag(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => removePageTag(client, pageId, tag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagsKey(pageId) }),
  });
}

export function useBacklinks(client: SupabaseClient<Database>, pageId: string) {
  const query = useQuery({ queryKey: backlinksKey(pageId), queryFn: () => listBacklinks(client, pageId) });
  return { backlinks: query.data ?? [], isLoading: query.isLoading };
}

export function useCreatePageLink(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetPageId: string) => createPageLink(client, pageId, targetPageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backlinksKey(pageId) }),
  });
}

export function useCheckpoints(client: SupabaseClient<Database>, pageId: string) {
  const query = useQuery({ queryKey: checkpointsKey(pageId), queryFn: () => listCheckpoints(client, pageId) });
  return { checkpoints: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateCheckpoint(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createCheckpoint(client, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkpointsKey(pageId) }),
  });
}

export function useRestoreCheckpoint(client: SupabaseClient<Database>, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkpoint: PageCheckpoint) => restoreCheckpoint(client, pageId, checkpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkpointsKey(pageId) });
      queryClient.invalidateQueries({ queryKey: blocksKey(pageId) });
      queryClient.invalidateQueries({ queryKey: pageKey(pageId) });
    },
  });
}
