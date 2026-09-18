import type { SupabaseClient, Database } from "@qqorvex/database";
import { mapAuthError } from "./authErrors";

export type OAuthProviderId = "google" | "discord" | "github";

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "discord", label: "Discord" },
  { id: "github", label: "GitHub" },
];

/**
 * Redireciona pro provedor (Google/Discord/GitHub); a troca de código por sessão acontece do lado
 * do Supabase Auth, que também é quem faz o account linking automático quando o e-mail do provedor
 * já pertence a uma conta existente (ver docs/decisions/pending.md — auth-registro-completo). Não
 * há callback próprio: a volta cai em `redirectTo`, o `AuthProvider` detecta a sessão sozinho.
 */
export async function signInWithOAuth(
  client: SupabaseClient<Database>,
  provider: OAuthProviderId,
): Promise<{ error: string | null }> {
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  return { error: error ? mapAuthError(error) : null };
}
