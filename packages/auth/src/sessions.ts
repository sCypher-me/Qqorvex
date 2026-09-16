import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * Central de Segurança — sessões/dispositivos (docs/decisions/central-seguranca-sessoes-design.md).
 * O schema `auth` não é exposto pela API automática do Supabase por segurança, então listar/
 * revogar sessões individuais passa pelas funções `list_my_sessions`/`revoke_my_session`
 * (`security definer`, só enxergam o que pertence a `auth.uid()`).
 */
export interface DeviceSession {
  id: string;
  createdAt: string;
  refreshedAt: string | null;
  notAfter: string | null;
  userAgent: string | null;
  ip: string | null;
}

export async function listSessions(client: SupabaseClient<Database>): Promise<DeviceSession[]> {
  const { data, error } = await client.rpc("list_my_sessions");
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    refreshedAt: row.refreshed_at,
    notAfter: row.not_after,
    userAgent: row.user_agent,
    ip: row.ip,
  }));
}

export async function revokeSession(client: SupabaseClient<Database>, sessionId: string): Promise<{ error: string | null }> {
  const { error } = await client.rpc("revoke_my_session", { target_session_id: sessionId });
  return { error: error?.message ?? null };
}

/** Decodifica o claim `session_id` do access token já em memória — sem chamada de rede extra. */
export async function getCurrentSessionId(client: SupabaseClient<Database>): Promise<string | null> {
  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64)) as { session_id?: string };
    return decoded.session_id ?? null;
  } catch {
    return null;
  }
}

export interface UserAgentInfo {
  browser: string;
  os: string;
}

/** Parser leve por regex — só pra exibição amigável ("Chrome no Windows"), sem dependência nova. */
export function parseUserAgent(userAgent: string | null): UserAgentInfo {
  if (!userAgent) return { browser: "Desconhecido", os: "Desconhecido" };

  let browser = "Desconhecido";
  if (/Edg\//.test(userAgent)) browser = "Edge";
  else if (/Chrome\//.test(userAgent)) browser = "Chrome";
  else if (/Firefox\//.test(userAgent)) browser = "Firefox";
  else if (/Safari\//.test(userAgent)) browser = "Safari";

  let os = "Desconhecido";
  if (/Windows/.test(userAgent)) os = "Windows";
  else if (/Mac OS X/.test(userAgent)) os = "macOS";
  else if (/Android/.test(userAgent)) os = "Android";
  else if (/iPhone|iPad/.test(userAgent)) os = "iOS";
  else if (/Linux/.test(userAgent)) os = "Linux";

  return { browser, os };
}
