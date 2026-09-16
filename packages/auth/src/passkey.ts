import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * Passkey (WebAuthn) via `auth.registerPasskey`/`auth.signInWithPasskey`/`auth.passkey.*` —
 * API própria do Supabase Auth, sem relação com `auth.mfa` (ver nota em `./mfa.ts`). Não é um
 * "segundo fator" empilhado sobre a senha: é uma forma alternativa de entrar, sem senha nenhuma.
 * Exige: (1) o client criado com `experimental: { passkey: true }` (ver `packages/database`) e
 * (2) "Enable Passkey authentication" habilitado no painel do projeto (Authentication →
 * Passkeys), com Relying Party ID/Origins configurados pro domínio em uso.
 */
export interface Passkey {
  id: string;
  friendlyName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Cadastra um passkey pro usuário já logado — faz a cerimônia inteira do navegador numa chamada só. */
export async function registerPasskey(client: SupabaseClient<Database>): Promise<{ error: string | null }> {
  const { error } = await client.auth.registerPasskey();
  return { error: error?.message ?? null };
}

/** Login sem senha usando um passkey já cadastrado — credencial discoverable, não pede e-mail antes. */
export async function signInWithPasskey(client: SupabaseClient<Database>): Promise<{ error: string | null }> {
  const { error } = await client.auth.signInWithPasskey();
  return { error: error?.message ?? null };
}

export async function listPasskeys(client: SupabaseClient<Database>): Promise<Passkey[]> {
  const { data, error } = await client.auth.passkey.list();
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    friendlyName: p.friendly_name ?? null,
    createdAt: p.created_at,
    lastUsedAt: p.last_used_at ?? null,
  }));
}

export async function renamePasskey(client: SupabaseClient<Database>, passkeyId: string, friendlyName: string): Promise<{ error: string | null }> {
  const { error } = await client.auth.passkey.update({ passkeyId, friendlyName });
  return { error: error?.message ?? null };
}

export async function deletePasskey(client: SupabaseClient<Database>, passkeyId: string): Promise<{ error: string | null }> {
  const { error } = await client.auth.passkey.delete({ passkeyId });
  return { error: error?.message ?? null };
}
