import type { SupabaseClient, Database } from "@qqorvex/database";
import { mapAuthError } from "./authErrors";

export type OAuthProviderId = "google" | "discord" | "github";

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "discord", label: "Discord" },
  { id: "github", label: "GitHub" },
];

export interface OAuthSignInOptions {
  redirectTo?: string;
  skipBrowserRedirect?: boolean;
}

/**
 * Redireciona pro provedor (Google/Discord/GitHub); a troca de código por sessão acontece do lado
 * do Supabase Auth, que também é quem faz o account linking automático quando o e-mail do provedor
 * já pertence a uma conta existente. Não
 * há callback próprio: a volta cai em `redirectTo`, o `AuthProvider` detecta a sessão sozinho.
 */
export async function signInWithOAuth(
  client: SupabaseClient<Database>,
  provider: OAuthProviderId,
  options: OAuthSignInOptions = {},
): Promise<{ error: string | null; url?: string }> {
  try {
    window.sessionStorage.setItem("qqorvex.oauth.started_at", String(Date.now()));
  } catch {
    // A sessão OAuth ainda funciona sem sessionStorage; o onboarding seguirá o estado da conta.
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: options.redirectTo ?? window.location.origin,
      ...(options.skipBrowserRedirect ? { skipBrowserRedirect: true } : {}),
    },
  });
  if (error) {
    try { window.sessionStorage.removeItem("qqorvex.oauth.started_at"); } catch { /* opcional */ }
  }
  return { error: error ? mapAuthError(error) : null, url: data.url ?? undefined };
}
