import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import type { Database } from "./types";

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * Fábrica do client Supabase. Recebe config explícita em vez de ler env vars
 * diretamente, para que este pacote funcione tanto no app Vite (import.meta.env)
 * quanto em scripts Node/Edge Functions (process.env) sem duplicar lógica.
 * `experimental.passkey` é o opt-in exigido pelo supabase-js para WebAuthn/Passkey
 * (recurso experimental — precisa também estar habilitado no painel do projeto).
 */
export function createSupabaseClient({ url, publishableKey }: SupabaseConfig): SupabaseClient<Database> {
  return createClient<Database>(url, publishableKey, { auth: { experimental: { passkey: true } } });
}

export type { Database };
export type { SupabaseClient, Session, User };
