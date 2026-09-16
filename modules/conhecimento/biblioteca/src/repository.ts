import type { SupabaseClient, Database } from "@qqorvex/database";
import { awardXp } from "@qqorvex/module-gamificacao";
import type { LibraryCollection, LibraryItem, LibraryItemCreator, LibraryItemStatus, NewLibraryItemInput } from "./types";
import { toLibraryItemInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listItems(client: Client): Promise<LibraryItem[]> {
  const { data, error } = await client
    .from("library_items")
    .select("*")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createItem(client: Client, userId: string, input: NewLibraryItemInput): Promise<LibraryItem> {
  const { data, error } = await client
    .from("library_items")
    .insert(toLibraryItemInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Confere o status anterior antes de gravar pra premiar XP só na transição pra "concluido" (docs/decisions/gamification-core-design.md). */
export async function updateItemStatus(client: Client, itemId: string, status: LibraryItemStatus): Promise<LibraryItem> {
  const { data: before, error: beforeError } = await client.from("library_items").select("status, user_id").eq("id", itemId).single();
  if (beforeError) throw beforeError;

  const { data, error } = await client
    .from("library_items")
    .update({ status })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;

  if (before.status !== "concluido" && status === "concluido") {
    await awardXp(client, before.user_id, "library_item_completed");
  }

  return data;
}

export async function updateProgress(
  client: Client,
  itemId: string,
  progress: { current: number; total?: number; mode: "numerico" | "percentual"; unit?: string },
): Promise<LibraryItem> {
  const { data, error } = await client
    .from("library_items")
    .update({
      progress_current: progress.current,
      progress_total: progress.total ?? null,
      progress_mode: progress.mode,
      progress_unit: progress.unit ?? null,
    })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleFavorite(client: Client, itemId: string, isFavorite: boolean): Promise<LibraryItem> {
  const { data, error } = await client
    .from("library_items")
    .update({ is_favorite: isFavorite })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(client: Client, itemId: string): Promise<void> {
  const { error } = await client.from("library_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function listCollections(client: Client): Promise<LibraryCollection[]> {
  const { data, error } = await client.from("library_collections").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCollection(client: Client, userId: string, name: string): Promise<LibraryCollection> {
  const { data, error } = await client
    .from("library_collections")
    .insert({ user_id: userId, name })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addItemToCollection(client: Client, collectionId: string, itemId: string): Promise<void> {
  const { error } = await client.from("library_collection_items").insert({ collection_id: collectionId, item_id: itemId });
  if (error) throw error;
}

/**
 * `library_item_creators` existia no schema desde a sessão original sem nenhuma função de
 * repositório — Metadata Provider Layer é o primeiro uso de verdade (autor/diretor vindo de
 * Google Books/TMDB). `role` é texto livre ("autor", "diretor", "elenco"...).
 */
export async function listItemCreators(client: Client, itemId: string): Promise<LibraryItemCreator[]> {
  const { data, error } = await client
    .from("library_item_creators")
    .select("*")
    .eq("item_id", itemId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addItemCreator(client: Client, itemId: string, name: string, role: string, orderIndex: number): Promise<void> {
  const { error } = await client.from("library_item_creators").insert({ item_id: itemId, name, role, order_index: orderIndex });
  if (error) throw error;
}
