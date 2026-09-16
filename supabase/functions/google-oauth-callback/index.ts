// Edge Function pública, chamada pelo próprio Google ao redirecionar de volta depois do
// consentimento OAuth — por isso verify_jwt=false (não existe JWT de usuário nessa chamada,
// é uma navegação de navegador comum). A segurança vem do `state`: um token opaco gerado em
// `google_oauth_states` pelo cliente autenticado antes de redirecionar pro Google (ver
// buildGoogleAuthUrl/useConnectGoogleCalendar em @qqorvex/module-agenda) — essa função consome
// (lê e apaga) o token pra descobrir de qual usuário era a solicitação, sem precisar de segredo
// de assinatura. Troca o código pelo refresh_token (Client Secret nunca sai daqui), cria o
// calendário dedicado "Qqorvex" e guarda a conexão.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: appSecretRows } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["app_base_url", "google_client_id", "google_client_secret"]);
  const secrets = Object.fromEntries((appSecretRows ?? []).map((r) => [r.key, r.value]));
  const appBaseUrl = secrets.app_base_url ?? "http://localhost:5173";

  function redirectToApp(status: "connected" | "error") {
    return Response.redirect(`${appBaseUrl}/seguranca?google=${status}`, 302);
  }

  if (oauthError || !code || !state) return redirectToApp("error");

  const { data: stateRow } = await supabase.from("google_oauth_states").select("user_id").eq("id", state).maybeSingle();
  if (!stateRow) return redirectToApp("error");
  await supabase.from("google_oauth_states").delete().eq("id", state);

  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth-callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: secrets.google_client_id ?? "",
      client_secret: secrets.google_client_secret ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.error("Google token exchange failed", await tokenResponse.text());
    return redirectToApp("error");
  }
  const { access_token: accessToken, refresh_token: refreshToken } = await tokenResponse.json();
  if (!refreshToken) {
    // Acontece se o usuário já tinha autorizado antes sem `prompt=consent` ter forçado um novo
    // refresh_token — orientação: revogar o acesso em myaccount.google.com/permissions e tentar de novo.
    console.error("Google did not return a refresh_token");
    return redirectToApp("error");
  }

  const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "Qqorvex" }),
  });
  if (!calendarResponse.ok) {
    console.error("Google calendar creation failed", await calendarResponse.text());
    return redirectToApp("error");
  }
  const calendar = await calendarResponse.json();

  const { error: upsertError } = await supabase.from("google_calendar_connections").upsert({
    user_id: stateRow.user_id,
    refresh_token: refreshToken,
    google_calendar_id: calendar.id,
  });
  if (upsertError) {
    console.error("Failed to store connection", upsertError);
    return redirectToApp("error");
  }

  return redirectToApp("connected");
});
