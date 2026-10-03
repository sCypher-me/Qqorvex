import type { SupabaseClient, Database, Tables, TablesUpdate } from "@qqorvex/database";

/**
 * "Perfil" (apresentação) da Conta, Perfil & Segurança — não confundir com Gamification Core
 * (Level/XP/Badges/Títulos), que é uma fonte separada futura. A linha é criada automaticamente no
 * signup por um trigger (`handle_new_user`); aqui só lemos/atualizamos, nunca inserimos/removemos.
 */
/** Campos seguros para a aplicação. Os campos internos do PIN nunca são lidos pelo cliente. */
export type Profile = Omit<Tables<"profiles">, "pin_hash" | "pin_failed_attempts" | "pin_locked_until" | "is_beta_tester" | "partner_campaign_id">;

export interface ProfileInput {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  fullName?: string | null;
  /** Já em E.164 (`+55...`) — normalização acontece no formulário, nunca aqui. */
  phone?: string | null;
  selectedTitle?: string | null;
  selectedBadgeKeys?: string[];
}

export const PROFILE_AVATAR_BUCKET = "avatars";
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const PROFILE_COLUMNS =
  "id, display_name, username, avatar_url, bio, created_at, updated_at, role, account_tier, full_name, phone, selected_title, selected_badge_keys";

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateProfileAvatar(file: File | Blob): string | null {
  if (!AVATAR_EXTENSIONS[file.type.toLowerCase()]) {
    return "Escolha uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return "A foto de perfil deve ter no máximo 5 MB.";
  }
  return null;
}

function avatarFileName(userId: string, file: File | Blob): string {
  const extension = AVATAR_EXTENSIONS[file.type.toLowerCase()];
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${randomId}.${extension}`;
}

export interface UploadedProfileAvatar {
  path: string;
  url: string;
}

export async function uploadProfileAvatar(
  client: SupabaseClient<Database>,
  userId: string,
  file: File | Blob,
): Promise<UploadedProfileAvatar> {
  const validationError = validateProfileAvatar(file);
  if (validationError) throw new Error(validationError);

  const path = avatarFileName(userId, file);
  const { error } = await client.storage.from(PROFILE_AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    await client.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
    throw new Error("Não foi possível preparar a foto de perfil.");
  }
  return { path, url: data.publicUrl };
}

export function getManagedProfileAvatarPath(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function removeManagedProfileAvatar(
  client: SupabaseClient<Database>,
  userId: string,
  url: string | null | undefined,
): Promise<void> {
  const path = getManagedProfileAvatarPath(url, userId);
  if (!path) return;
  const { error } = await client.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getProfile(client: SupabaseClient<Database>, userId: string): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** `username` tem um formato exigido pelo banco (`^[a-z0-9_]{3,20}$`) e é único — erros viram mensagem amigável. */
export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  input: ProfileInput,
): Promise<{ profile: Profile | null; error: string | null }> {
  const update: TablesUpdate<"profiles"> = {};
  if (input.displayName !== undefined) update.display_name = input.displayName;
  if (input.username !== undefined) update.username = input.username;
  if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) update.bio = input.bio;
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.selectedTitle !== undefined) update.selected_title = input.selectedTitle;
  if (input.selectedBadgeKeys !== undefined) update.selected_badge_keys = input.selectedBadgeKeys;

  const { data, error } = await client
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") return { profile: null, error: "Esse nome de usuário já está em uso." };
    if (error.code === "23514" && error.message.includes("username"))
      return { profile: null, error: "Nome de usuário inválido: use 3–20 letras minúsculas, números ou _." };
    if (error.code === "23514" && error.message.includes("phone")) return { profile: null, error: "Telefone inválido." };
    if (error.code === "23514" && error.message.includes("full_name")) return { profile: null, error: "Nome completo não pode ficar vazio." };
    return { profile: null, error: error.message };
  }
  return { profile: data, error: null };
}
