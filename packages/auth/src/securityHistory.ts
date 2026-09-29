import type { SupabaseClient, Database } from "@qqorvex/database";

export interface SecurityLoginEvent {
  id: string;
  occurredAt: string;
  action: "login" | "user_signedup" | string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function listMySecurityLoginHistory(
  client: SupabaseClient<Database>,
): Promise<{ events: SecurityLoginEvent[]; error: string | null }> {
  const { data, error } = await client.rpc("list_my_security_login_history");
  if (error) return { events: [], error: error.message };

  return {
    events: (data ?? []).map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      action: row.action,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    })),
    error: null,
  };
}
