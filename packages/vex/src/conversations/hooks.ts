import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  renameConversation,
} from "./repository";
import type { ChatRole } from "../types";

const CONVERSATIONS_KEY = ["vex-conversations"] as const;
const messagesKey = (conversationId: string) => ["vex-messages", conversationId] as const;

export function useVexConversations(client: SupabaseClient<Database>) {
  return useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: () => listConversations(client) });
}

export function useCreateVexConversation(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createConversation(client, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useRenameVexConversation(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      renameConversation(client, conversationId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useDeleteVexConversation(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(client, conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useVexMessages(client: SupabaseClient<Database>, conversationId: string | null) {
  return useQuery({
    queryKey: messagesKey(conversationId ?? "none"),
    queryFn: () => listMessages(client, conversationId!),
    enabled: conversationId !== null,
  });
}

export function useAppendVexMessage(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      role,
      content,
    }: {
      conversationId: string;
      role: Extract<ChatRole, "user" | "assistant">;
      content: string;
    }) => appendMessage(client, conversationId, role, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: messagesKey(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}
