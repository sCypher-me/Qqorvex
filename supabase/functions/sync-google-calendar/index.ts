// Edge Function acionada por pg_cron a cada 10 minutos (autenticação por segredo compartilhado
// via header X-Cron-Secret, mesmo `cron_secret` já usado por send-notifications — por isso
// verify_jwt=false). Sincronização bidirecional completa: "quem editou por último vence" quando
// os dois lados mudaram a mesma coisa. Ver docs/decisions/integracoes-agenda-design.md.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars";

function toGoogleEventBody(event: {
  title: string;
  location: string | null;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
}) {
  return {
    summary: event.title,
    location: event.location ?? undefined,
    description: event.description ?? undefined,
    start: event.is_all_day ? { date: event.start_at.slice(0, 10) } : { dateTime: event.start_at },
    end: event.is_all_day ? { date: event.end_at.slice(0, 10) } : { dateTime: event.end_at },
  };
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: cronSecretRow } = await supabase.from("app_secrets").select("value").eq("key", "cron_secret").single();
  if (!cronSecretRow || req.headers.get("x-cron-secret") !== cronSecretRow.value) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: googleSecretRows } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["google_client_id", "google_client_secret"]);
  const googleSecrets = Object.fromEntries((googleSecretRows ?? []).map((r) => [r.key, r.value]));

  const { data: connections } = await supabase.from("google_calendar_connections").select("*");

  let connectionsSynced = 0;
  let eventsFromGoogle = 0;
  let eventsToGoogle = 0;

  for (const connection of connections ?? []) {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: connection.refresh_token,
        client_id: googleSecrets.google_client_id ?? "",
        client_secret: googleSecrets.google_client_secret ?? "",
        grant_type: "refresh_token",
      }),
    });
    if (!tokenResponse.ok) {
      console.error("Falha ao renovar token do Google", connection.user_id, await tokenResponse.text());
      continue;
    }
    const { access_token: accessToken } = await tokenResponse.json();
    const calendarId = connection.google_calendar_id;
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    // Exclusões pendentes (apagadas no Qqorvex, ainda não refletidas no Google).
    const { data: pendingDeletions } = await supabase
      .from("pending_google_deletions")
      .select("*")
      .eq("user_id", connection.user_id);
    for (const deletion of pendingDeletions ?? []) {
      await fetch(`${CALENDAR_API}/${calendarId}/events/${deletion.google_event_id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await supabase.from("pending_google_deletions").delete().eq("id", deletion.id);
    }

    const sinceIso = connection.last_synced_at ?? new Date(0).toISOString();

    // Puxa o que mudou no Google desde a última sincronização.
    const listUrl = new URL(`${CALENDAR_API}/${calendarId}/events`);
    listUrl.searchParams.set("updatedMin", sinceIso);
    listUrl.searchParams.set("showDeleted", "true");
    listUrl.searchParams.set("singleEvents", "true");
    const listResponse = await fetch(listUrl, { headers: authHeaders });
    // deno-lint-ignore no-explicit-any
    let googleEvents: any[] = [];
    if (listResponse.ok) {
      googleEvents = (await listResponse.json()).items ?? [];
    } else {
      console.error("Falha ao listar eventos do Google", connection.user_id, await listResponse.text());
    }

    for (const googleEvent of googleEvents ?? []) {
      if (googleEvent.status === "cancelled") {
        await supabase.from("events").delete().eq("google_event_id", googleEvent.id).eq("user_id", connection.user_id);
        continue;
      }

      const { data: existing } = await supabase
        .from("events")
        .select("id, updated_at, google_updated_at")
        .eq("google_event_id", googleEvent.id)
        .eq("user_id", connection.user_id)
        .maybeSingle();

      const startAt = googleEvent.start.dateTime ?? `${googleEvent.start.date}T00:00:00Z`;
      const endAt = googleEvent.end.dateTime ?? `${googleEvent.end.date}T00:00:00Z`;
      const isAllDay = !googleEvent.start.dateTime;
      const googleUpdatedAt = new Date(googleEvent.updated);

      if (existing) {
        const knownGoogleUpdatedAt = existing.google_updated_at ? new Date(existing.google_updated_at) : new Date(0);
        const qqorvexUpdatedAt = new Date(existing.updated_at);
        // Só aplica se é uma mudança do Google que ainda não vimos E vence a comparação de
        // "quem editou por último" contra o lado Qqorvex.
        if (googleUpdatedAt > knownGoogleUpdatedAt && googleUpdatedAt >= qqorvexUpdatedAt) {
          await supabase
            .from("events")
            .update({
              title: googleEvent.summary ?? "(Sem título)",
              location: googleEvent.location ?? null,
              description: googleEvent.description ?? null,
              start_at: startAt,
              end_at: endAt,
              is_all_day: isAllDay,
              google_updated_at: googleEvent.updated,
            })
            .eq("id", existing.id);
          eventsFromGoogle++;
        }
      } else {
        await supabase.from("events").insert({
          user_id: connection.user_id,
          title: googleEvent.summary ?? "(Sem título)",
          location: googleEvent.location ?? null,
          description: googleEvent.description ?? null,
          start_at: startAt,
          end_at: endAt,
          is_all_day: isAllDay,
          category: "compromisso",
          google_event_id: googleEvent.id,
          google_updated_at: googleEvent.updated,
        });
        eventsFromGoogle++;
      }
    }

    // Empurra o que mudou no Qqorvex desde a última sincronização.
    const { data: changedEvents } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", connection.user_id)
      .gt("updated_at", sinceIso);

    for (const event of changedEvents ?? []) {
      const body = toGoogleEventBody(event);

      if (!event.google_event_id) {
        const createResponse = await fetch(`${CALENDAR_API}/${calendarId}/events`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (createResponse.ok) {
          const created = await createResponse.json();
          const { error: createUpdateError } = await supabase
            .from("events")
            .update({ google_event_id: created.id, google_updated_at: created.updated })
            .eq("id", event.id);
          if (createUpdateError) console.error("Falha ao salvar google_event_id", createUpdateError);
          eventsToGoogle++;
        } else {
          console.error("Falha ao criar evento no Google", await createResponse.text());
        }
        continue;
      }

      const knownGoogleUpdatedAt = event.google_updated_at ? new Date(event.google_updated_at) : new Date(0);
      const qqorvexUpdatedAt = new Date(event.updated_at);
      if (qqorvexUpdatedAt > knownGoogleUpdatedAt) {
        const patchResponse = await fetch(`${CALENDAR_API}/${calendarId}/events/${event.google_event_id}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (patchResponse.ok) {
          const updated = await patchResponse.json();
          const { error: patchUpdateError } = await supabase
            .from("events")
            .update({ google_updated_at: updated.updated })
            .eq("id", event.id);
          if (patchUpdateError) console.error("Falha ao salvar google_updated_at", patchUpdateError);
          eventsToGoogle++;
        } else {
          console.error("Falha ao atualizar evento no Google", await patchResponse.text());
        }
      }
    }

    // Calculado só agora, depois de todas as escritas — se fosse capturado no início, os
    // próprios `update()` acima (que reescrevem `updated_at` via trigger) ficariam "mais novos"
    // que esse corte, e o mesmo evento seria empurrado de novo no próximo ciclo.
    const now = new Date().toISOString();
    await supabase.from("google_calendar_connections").update({ last_synced_at: now }).eq("user_id", connection.user_id);
    connectionsSynced++;
  }

  return new Response(JSON.stringify({ connectionsSynced, eventsFromGoogle, eventsToGoogle }), {
    headers: { "Content-Type": "application/json" },
  });
});
