// Edge Function pública, chamada pelo próprio Discord ao redirecionar depois do consentimento
// OAuth (navegação comum, sem JWT — por isso verify_jwt=false). A segurança vem do `state`:
// um token opaco criado em `discord_oauth_states` por `discord-link` para o usuário autenticado;
// aqui ele é consumido (lido e apagado) e expira em 10 minutos. Troca o código pelos tokens
// (o segredo do cliente nunca sai do servidor), envia os metadados dos cargos e guarda a conexão.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { exchangeCode, fetchDiscordUser, pushRoleConnection, readDiscordCredentials, readRoleMetadata } from "../_shared/discord.ts";

const STATE_TTL_MS = 10 * 60_000;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: baseRow } = await admin.from("app_secrets").select("value").eq("key", "app_base_url").maybeSingle();
  const appBaseUrl = baseRow?.value ?? "http://localhost:5173";
  // A conexão começa (e mostra o resultado) em Configurações → Conexões, que lê `?discord=`.
  const redirectToApp = (status: "connected" | "error" | "cancelled") =>
    Response.redirect(`${appBaseUrl}/configuracoes/conexoes?discord=${status}`, 302);

  if (oauthError === "access_denied") return redirectToApp("cancelled");
  if (oauthError || !code || !state) return redirectToApp("error");

  const { data: stateRow } = await admin
    .from("discord_oauth_states")
    .select("user_id, created_at")
    .eq("id", state)
    .maybeSingle();
  await admin.from("discord_oauth_states").delete().eq("id", state);
  if (!stateRow || new Date(stateRow.created_at).getTime() < Date.now() - STATE_TTL_MS) return redirectToApp("error");

  const credentials = await readDiscordCredentials(admin);
  if (!credentials) return redirectToApp("error");

  try {
    const tokens = await exchangeCode(credentials, code);
    const discordUser = await fetchDiscordUser(tokens.accessToken);
    const { metadata, username } = await readRoleMetadata(admin, stateRow.user_id);
    await pushRoleConnection(credentials.clientId, tokens.accessToken, metadata, username);

    // Um Discord só pode estar ligado a uma conta do Qqorvex: a conexão mais recente vence.
    await admin.from("discord_connections").delete().eq("discord_user_id", discordUser.id).neq("user_id", stateRow.user_id);
    const { error } = await admin.from("discord_connections").upsert({
      user_id: stateRow.user_id,
      discord_user_id: discordUser.id,
      discord_username: discordUser.username,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresAt.toISOString(),
      role_metadata: metadata,
      synced_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.error("Discord link failed", error);
    return redirectToApp("error");
  }

  return redirectToApp("connected");
});
