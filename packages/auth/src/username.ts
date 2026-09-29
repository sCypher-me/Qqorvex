import type { SupabaseClient, Database } from "@qqorvex/database";

/** Espelha a constraint `username_format` do banco (`^[a-z0-9_]{3,20}$`) — checagem client-side é só UX, o banco sempre valida de novo. */
export function isUsernameFormatValid(candidate: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(candidate);
}

/** `is_username_available` é `SECURITY DEFINER` chamável por `anon` de propósito — funciona antes do cadastro existir. */
export async function checkUsernameAvailable(client: SupabaseClient<Database>, candidate: string): Promise<boolean> {
  const normalized = candidate.trim().toLowerCase();
  if (!isUsernameFormatValid(normalized)) return false;
  const { data, error } = await client.rpc("is_username_available", { candidate: normalized });
  if (error) throw error;
  if (data === null) throw new Error("A disponibilidade do nome não pôde ser confirmada.");
  return data;
}
