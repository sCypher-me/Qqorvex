import type { SupabaseClient, Database } from "@qqorvex/database";
import type { ChatRole } from "../types";
import type { VexConversation, VexMessageRow } from "./types";

type Client = SupabaseClient<Database>;

export async function listConversations(client: Client): Promise<VexConversation[]> {
  const { data, error } = await client.from("vex_conversations").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createConversation(client: Client, userId: string): Promise<VexConversation> {
  const { data, error } = await client
    .from("vex_conversations")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function renameConversation(client: Client, conversationId: string, title: string): Promise<VexConversation> {
  const { data, error } = await client
    .from("vex_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConversation(client: Client, conversationId: string): Promise<void> {
  const { error } = await client.from("vex_conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

export async function listMessages(client: Client, conversationId: string): Promise<VexMessageRow[]> {
  const { data, error } = await client
    .from("vex_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Toca `updated_at` da conversa junto, pra lista ordenada por "mais recente primeiro" refletir a última troca. */
export async function appendMessage(
  client: Client,
  conversationId: string,
  role: Extract<ChatRole, "user" | "assistant">,
  content: string,
): Promise<VexMessageRow> {
  const { data, error } = await client
    .from("vex_messages")
    .insert({ conversation_id: conversationId, role, content })
    .select("*")
    .single();
  if (error) throw error;
  await client.from("vex_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return data;
}
