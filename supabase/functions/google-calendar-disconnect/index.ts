import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);

  const { data: connection, error: readError } = await admin
    .from("google_calendar_connections")
    .select("refresh_token")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (readError) {
    console.error("Google Calendar connection lookup failed", readError);
    return json({ error: "Não foi possível localizar a conexão." }, 500);
  }
  if (!connection) return json({ connected: false });

  let revoked = false;
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: connection.refresh_token }),
    });

    if (response.ok) {
      revoked = true;
    } else {
      let providerError = "";
      try {
        const body = await response.json();
        providerError = typeof body?.error === "string" ? body.error : "";
      } catch {
        // Keep the provider response body out of logs; it is not needed to handle failure.
      }
      if (response.status === 400 && providerError === "invalid_token") {
        // The token was already expired/revoked, so there is no remaining grant to use.
        revoked = true;
      } else {
        console.error("Google OAuth revocation failed", response.status, providerError);
        return json({ error: "O Google não confirmou a revogação. Tente novamente." }, 502);
      }
    }
  } catch (error) {
    console.error("Google OAuth revocation request failed", error);
    return json({ error: "Não foi possível falar com o Google. Tente novamente." }, 502);
  }

  if (!revoked) return json({ error: "A revogação não foi confirmada." }, 502);

  const { error: deleteError } = await admin
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", authData.user.id);
  if (deleteError) {
    console.error("Revoked Google connection could not be removed", deleteError);
    return json({ error: "O acesso foi revogado no Google, mas não foi possível atualizar o Qqorvex." }, 500);
  }

  return json({ connected: false });
});
