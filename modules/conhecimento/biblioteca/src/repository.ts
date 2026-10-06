import type { SupabaseClient, Database, TablesUpdate } from "@qqorvex/database";
import { refreshGamificationAfterSourceWrite } from "@qqorvex/module-gamificacao";
import { LIBRARY_COVER_MAX_SIZE_BYTES, LIBRARY_COVER_MIME_TYPES, type LibraryCoverChange, type LibraryItem, type LibraryItemCreator, type LibraryItemEditInput, type LibraryItemStatus, type NewLibraryItemInput } from "./types";
import { toLibraryItemInsert, toLibraryItemUpdate } from "./types";

type Client = SupabaseClient<Database>;

const COVER_BUCKET = "library-covers";
const SIGNED_COVER_TTL_SECONDS = 60 * 60 * 24 * 7;

async function withCoverUrls(client: Client, items: LibraryItem[]): Promise<LibraryItem[]> {
  return Promise.all(items.map(async (item) => {
    if (!item.cover_image_path) return item;
    const { data, error } = await client.storage.from(COVER_BUCKET).createSignedUrl(item.cover_image_path, SIGNED_COVER_TTL_SECONDS);
    if (error) {
      console.warn("Não foi possível carregar a capa privada da Biblioteca:", error);
      return { ...item, cover_url: null };
    }
    return { ...item, cover_url: data.signedUrl };
  }));
}

async function uploadCover(client: Client, userId: string, file: File): Promise<string> {
  if (!(LIBRARY_COVER_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Escolha uma imagem PNG, JPG ou WebP.");
  }
  if (file.size <= 0 || file.size > LIBRARY_COVER_MAX_SIZE_BYTES) {
    throw new Error("A imagem da capa deve ter até 5 MB.");
  }
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(COVER_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function listItems(client: Client): Promise<LibraryItem[]> {
  const { data, error } = await client
    .from("library_items")
    .select("*")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return withCoverUrls(client, data);
}

export async function listArchivedItems(client: Client): Promise<LibraryItem[]> {
  const { data, error } = await client
    .from("library_items")
    .select("*")
    .eq("is_archived", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return withCoverUrls(client, data);
}

export async function createItem(client: Client, userId: string, input: NewLibraryItemInput, coverFile?: File): Promise<LibraryItem> {
  const coverImagePath = coverFile ? await uploadCover(client, userId, coverFile) : null;
  const { data, error } = await client
    .from("library_items")
    .insert({ ...toLibraryItemInsert(userId, input), cover_image_path: coverImagePath })
    .select("*")
    .single();
  if (error) {
    if (coverImagePath) {
      const { error: cleanupError } = await client.storage.from(COVER_BUCKET).remove([coverImagePath]);
      if (cleanupError) console.warn("Não foi possível remover uma capa após falha ao salvar:", cleanupError);
    }
    throw error;
  }
  return (await withCoverUrls(client, [data]))[0]!;
}

/**
 * Edita os dados do item e, se pedido, a capa. Sem `cover` nenhum campo de capa é gravado — o
 * `cover_url` em memória pode ser um link assinado temporário (ver `withCoverUrls`). Ao trocar
 * ou remover uma imagem enviada, o arquivo antigo sai do Storage depois que o banco confirmou.
 */
export async function updateItem(
  client: Client,
  userId: string,
  itemId: string,
  input: LibraryItemEditInput,
  cover?: LibraryCoverChange,
): Promise<LibraryItem> {
  const { data: before, error: lookupError } = await client.from("library_items").select("cover_image_path").eq("id", itemId).single();
  if (lookupError) throw lookupError;

  const update: TablesUpdate<"library_items"> = toLibraryItemUpdate(input);
  let uploadedPath: string | null = null;
  if (cover && "file" in cover) {
    uploadedPath = await uploadCover(client, userId, cover.file);
    update.cover_image_path = uploadedPath;
    update.cover_url = null;
  } else if (cover) {
    update.cover_image_path = null;
    update.cover_url = cover.url;
  }

  const { data, error } = await client.from("library_items").update(update).eq("id", itemId).select("*").single();
  if (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await client.storage.from(COVER_BUCKET).remove([uploadedPath]);
      if (cleanupError) console.warn("Não foi possível remover uma capa após falha ao salvar:", cleanupError);
    }
    throw error;
  }

  if (cover && before.cover_image_path) {
    const { error: storageError } = await client.storage.from(COVER_BUCKET).remove([before.cover_image_path]);
    if (storageError) console.warn("A capa antiga não foi removida do armazenamento:", storageError);
  }

  return (await withCoverUrls(client, [data]))[0]!;
}

/** Confere o status anterior antes de gravar pra premiar XP só na transição pra "concluido". */
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
    await refreshGamificationAfterSourceWrite(client, before.user_id);
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

export async function updateItemReview(
  client: Client,
  itemId: string,
  review: { rating: number | null; shortNote: string | null },
): Promise<LibraryItem> {
  const { data, error } = await client
    .from("library_items")
    .update({ rating: review.rating, short_note: review.shortNote })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function archiveItem(client: Client, itemId: string, isArchived: boolean): Promise<LibraryItem> {
  const { data, error } = await client
    .from("library_items")
    .update({ is_archived: isArchived })
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
  const { data: item, error: lookupError } = await client.from("library_items").select("cover_image_path").eq("id", itemId).maybeSingle();
  if (lookupError) throw lookupError;
  const { error } = await client.from("library_items").delete().eq("id", itemId);
  if (error) throw error;
  if (item?.cover_image_path) {
    const { error: storageError } = await client.storage.from(COVER_BUCKET).remove([item.cover_image_path]);
    if (storageError) console.warn("A capa não foi removida do armazenamento:", storageError);
  }
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

/**
 * Substitui a lista de criadores pela ordem informada. Quem continua na lista mantém o papel que
 * já tinha (ex.: "autor" vindo do Google Books); nomes novos entram como "criador".
 */
export async function replaceItemCreators(client: Client, itemId: string, names: string[]): Promise<void> {
  const current = await listItemCreators(client, itemId);
  if (current.length === names.length && current.every((creator, index) => creator.name === names[index])) return;

  const roleByName = new Map(current.map((creator) => [creator.name, creator.role]));
  const { error: deleteError } = await client.from("library_item_creators").delete().eq("item_id", itemId);
  if (deleteError) throw deleteError;
  if (names.length === 0) return;

  const { error } = await client
    .from("library_item_creators")
    .insert(names.map((name, index) => ({ item_id: itemId, name, role: roleByName.get(name) ?? "criador", order_index: index })));
  if (error) throw error;
}
