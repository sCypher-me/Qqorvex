// Cargos vinculados do Discord: OAuth do aplicativo do Qqorvex no Discord e envio dos metadados
// que o servidor usa para dar os cargos. Credenciais em app_secrets (discord_client_id,
// discord_client_secret); o segredo nunca sai das Edge Functions.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { readAppSecrets } from "./appSecrets.ts";

const API = "https://discord.com/api/v10";
const REQUEST_TIMEOUT_MS = 10_000;
export const DISCORD_SCOPES = "identify role_connections.write";

export interface DiscordCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DiscordTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Metadados no formato do Discord: booleanos viram 1/0. As chaves batem com o schema registrado no aplicativo. */
export interface RoleMetadata {
  beta_tester: boolean;
  plus: boolean;
  lifetime: boolean;
  parceiro: boolean;
}

export async function readDiscordCredentials(admin: SupabaseClient): Promise<DiscordCredentials | null> {
  let secrets: Record<string, string>;
  try {
    secrets = await readAppSecrets(admin, ["discord_client_id", "discord_client_secret"]);
  } catch (error) {
    console.error("discord: credenciais indisponíveis após novas tentativas", error);
    return null;
  }
  if (!secrets.discord_client_id || !secrets.discord_client_secret) return null;
  return {
    clientId: secrets.discord_client_id,
    clientSecret: secrets.discord_client_secret,
    redirectUri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-link-callback`,
  };
}

export function buildAuthorizeUrl(credentials: DiscordCredentials, state: string): string {
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES,
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function tokenRequest(credentials: DiscordCredentials, body: Record<string, string>): Promise<DiscordTokens> {
  const response = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, ...body }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const error = new Error(`Discord token request failed: ${response.status} ${await response.text()}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + Number(data.expires_in) * 1000),
  };
}

export const exchangeCode = (credentials: DiscordCredentials, code: string) =>
  tokenRequest(credentials, { grant_type: "authorization_code", code, redirect_uri: credentials.redirectUri });

export const refreshTokens = (credentials: DiscordCredentials, refreshToken: string) =>
  tokenRequest(credentials, { grant_type: "refresh_token", refresh_token: refreshToken });

export async function revokeToken(credentials: DiscordCredentials, token: string): Promise<void> {
  await fetch(`${API}/oauth2/token/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, token, token_type_hint: "access_token" }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => undefined);
}

export async function fetchDiscordUser(accessToken: string): Promise<{ id: string; username: string }> {
  const response = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Discord user lookup failed: ${response.status}`);
  const user = await response.json();
  return { id: user.id, username: user.username };
}

/** Lê do banco os metadados atuais da conta (função discord_role_metadata, só service_role). */
export async function readRoleMetadata(admin: SupabaseClient, userId: string): Promise<{ metadata: RoleMetadata; username: string | null }> {
  const { data, error } = await admin.rpc("discord_role_metadata", { p_user_id: userId });
  if (error) throw error;
  const value = (data ?? {}) as Record<string, unknown>;
  return {
    metadata: {
      beta_tester: value.beta_tester === true,
      plus: value.plus === true,
      lifetime: value.lifetime === true,
      parceiro: value.parceiro === true,
    },
    username: typeof value.username === "string" ? value.username : null,
  };
}

/** Envia os metadados para o Discord em nome da pessoa (o servidor aplica os cargos sozinho). */
export async function pushRoleConnection(
  clientId: string,
  accessToken: string,
  metadata: RoleMetadata,
  username: string | null,
): Promise<void> {
  const response = await fetch(`${API}/users/@me/applications/${clientId}/role-connection`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      platform_name: "Qqorvex",
      ...(username ? { platform_username: username.slice(0, 100) } : {}),
      metadata: Object.fromEntries(Object.entries(metadata).map(([key, on]) => [key, on ? 1 : 0])),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Discord role connection update failed: ${response.status} ${await response.text()}`);
}
