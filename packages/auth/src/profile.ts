import type { SupabaseClient, Database, Tables, TablesUpdate } from "@qqorvex/database";

/**
 * "Perfil" (apresentação) da Conta, Perfil & Segurança — não confundir com Gamification Core
 * (Level/XP/Badges/Títulos), que é uma fonte separada futura. A linha é criada automaticamente no
 * signup por um trigger (`handle_new_user`); aqui só lemos/atualizamos, nunca inserimos/removemos.
 */
export type Profile = Tables<"profiles">;

export interface ProfileInput {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export async function getProfile(client: SupabaseClient<Database>, userId: string): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
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

  const { data, error } = await client.from("profiles").update(update).eq("id", userId).select("*").single();
  if (error) {
    if (error.code === "23505") return { profile: null, error: "Esse nome de usuário já está em uso." };
    if (error.code === "23514") return { profile: null, error: "Nome de usuário inválido: use 3–20 letras minúsculas, números ou _." };
    return { profile: null, error: error.message };
  }
  return { profile: data, error: null };
}
