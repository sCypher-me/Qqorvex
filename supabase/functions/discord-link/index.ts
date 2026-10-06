// Conexão do Discord para os cargos vinculados, chamada pelo app com a sessão do usuário.
// { action: "start" }: cria o `state` de uso único e devolve a URL de autorização do Discord.
// { action: "disconnect" }: zera os cargos no Discord, revoga o token e apaga a conexão.
// O usuário sempre vem do JWT validado; nunca de um user_id enviado pelo cliente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildAuthorizeUrl, pushRoleConnection, readDiscordCredentials, revokeToken } from "../_shared/discord.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Serviço temporariamente indisponível." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const userId = authData.user.id;

  const credentials = await readDiscordCredentials(admin);
  if (!credentials) return json({ error: "A conexão com o Discord ainda não está configurada." }, 503);

  let action = "";
  try {
    action = String((await req.json())?.action ?? "");
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }

  if (action === "start") {
    // Limpa estados antigos da mesma pessoa antes de criar um novo.
    await admin.from("discord_oauth_states").delete().eq("user_id", userId);
    const { data: stateRow, error } = await admin.from("discord_oauth_states").insert({ user_id: userId }).select("id").single();
    if (error || !stateRow) {
      console.error("Failed to create Discord OAuth state", error);
      return json({ error: "Não foi possível iniciar a conexão." }, 500);
    }
    return json({ url: buildAuthorizeUrl(credentials, stateRow.id) });
  }

  if (action === "disconnect") {
    const { data: connection } = await admin
      .from("discord_connections")
      .select("access_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (!connection) return json({ connected: false });

    // Zera os cargos antes de revogar: sem isso o Discord manteria os últimos metadados enviados.
    await pushRoleConnection(credentials.clientId, connection.access_token, { beta_tester: false, plus: false, lifetime: false, parceiro: false }, null)
      .catch((error) => console.error("Failed to clear Discord role connection", error));
    await revokeToken(credentials, connection.access_token);

    const { error } = await admin.from("discord_connections").delete().eq("user_id", userId);
    if (error) {
      console.error("Failed to delete Discord connection", error);
      return json({ error: "Não foi possível desconectar agora." }, 500);
    }
    return json({ connected: false });
  }

  return json({ error: "Ação desconhecida." }, 400);
});
