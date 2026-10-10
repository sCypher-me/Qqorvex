// Edge Function acionada por pg_cron de hora em hora (autenticação por segredo compartilhado via
// header X-Cron-Secret, o mesmo `cron_secret` de send-notifications — por isso verify_jwt=false).
// Mantém os cargos vinculados em dia: renova tokens perto de expirar, recalcula os metadados de
// cada conexão e só chama o Discord quando algo mudou (ou uma vez por dia, para garantir).
// Se a pessoa revogou o acesso pelo Discord, a conexão é removida.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushRoleConnection, readDiscordCredentials, readRoleMetadata, refreshTokens } from "../_shared/discord.ts";
import { verifyCronSecret } from "../_shared/appSecrets.ts";

const RUN_BUDGET_MS = 50_000;
const BATCH_SIZE = 100;
const REFRESH_MARGIN_MS = 24 * 60 * 60_000;
const RESYNC_AFTER_MS = 24 * 60 * 60_000;

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const denied = await verifyCronSecret(admin, req);
  if (denied) return denied;

  const credentials = await readDiscordCredentials(admin);
  if (!credentials) return Response.json({ skipped: "credenciais do Discord não configuradas" });

  const { data: connections, error } = await admin
    .from("discord_connections")
    .select("user_id, access_token, refresh_token, token_expires_at, role_metadata, synced_at")
    .order("synced_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);
  if (error) {
    console.error("Failed to list Discord connections", error);
    return new Response("Erro ao listar conexões", { status: 500 });
  }

  let updated = 0;
  let removed = 0;
  for (const connection of connections ?? []) {
    if (Date.now() - startedAt > RUN_BUDGET_MS) break;
    try {
      let accessToken = connection.access_token;
      if (new Date(connection.token_expires_at).getTime() - Date.now() < REFRESH_MARGIN_MS) {
        try {
          const tokens = await refreshTokens(credentials, connection.refresh_token);
          accessToken = tokens.accessToken;
          await admin.from("discord_connections").update({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            token_expires_at: tokens.expiresAt.toISOString(),
          }).eq("user_id", connection.user_id);
        } catch (refreshError) {
          // 400 invalid_grant = a pessoa revogou o acesso no Discord: a conexão não serve mais.
          if ((refreshError as { status?: number }).status === 400) {
            await admin.from("discord_connections").delete().eq("user_id", connection.user_id);
            removed += 1;
            continue;
          }
          throw refreshError;
        }
      }

      const { metadata, username } = await readRoleMetadata(admin, connection.user_id);
      const changed = JSON.stringify(metadata) !== JSON.stringify(connection.role_metadata);
      const stale = !connection.synced_at || Date.now() - new Date(connection.synced_at).getTime() > RESYNC_AFTER_MS;
      if (!changed && !stale) continue;

      await pushRoleConnection(credentials.clientId, accessToken, metadata, username);
      await admin.from("discord_connections")
        .update({ role_metadata: metadata, synced_at: new Date().toISOString() })
        .eq("user_id", connection.user_id);
      updated += 1;
    } catch (syncError) {
      console.error("Discord role sync failed for a connection", syncError);
    }
  }

  return Response.json({ checked: connections?.length ?? 0, updated, removed });
});
