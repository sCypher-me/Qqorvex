import type { SupabaseClient, Database } from "@qqorvex/database";
import { mapAuthError } from "./authErrors";

type Client = SupabaseClient<Database>;
/** E-mails abrem o app web também quando solicitados no aplicativo nativo. */
export function emailRedirect(path = "/login"): string {
  const origin = typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)
    && !["tauri.localhost", "localhost"].includes(window.location.hostname)
    ? window.location.origin : "https://qqorvex-app.pages.dev";
  return `${origin}${path}`;
}

export async function requestEmailLogin(client: Client, email: string, captchaToken?: string) {
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false, emailRedirectTo: emailRedirect(), ...(captchaToken ? { captchaToken } : {}) },
  });
  return { error: error ? mapAuthError(error) : null };
}

export async function verifyEmailLogin(client: Client, email: string, token: string) {
  const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
  return { error: error ? mapAuthError(error) : null };
}

export async function requestReauthentication(client: Client) {
  const { error } = await client.auth.reauthenticate();
  return { error: error ? mapAuthError(error) : null };
}

export async function changePassword(client: Client, password: string, nonce?: string) {
  const { error } = await client.auth.updateUser({ password, ...(nonce?.trim() ? { nonce: nonce.trim() } : {}) });
  return {
    error: error ? mapAuthError(error) : null,
    requiresReauthentication: error?.code === "reauthentication_needed",
  };
}
