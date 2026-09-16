import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useConnectGoogleCalendar, useDisconnectGoogleCalendar, useGoogleCalendarConnection } from "../hooks/useGoogleCalendar";

/**
 * Sincronização bidirecional completa com um calendário "Qqorvex" dedicado (não o pessoal) —
 * ver docs/decisions/integracoes-agenda-design.md. "Desconectar" só apaga a conexão, nunca
 * eventos já sincronizados nos dois lados.
 */
export function GoogleCalendarSection({
  client,
  userId,
  supabaseUrl,
  googleClientId,
}: {
  client: SupabaseClient<Database>;
  userId: string;
  supabaseUrl: string;
  googleClientId: string | undefined;
}) {
  const { connection, isLoading } = useGoogleCalendarConnection(client);
  const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;
  const connect = useConnectGoogleCalendar(client, userId, redirectUri, googleClientId ?? "");
  const disconnect = useDisconnectGoogleCalendar(client, userId);

  // `google-oauth-callback` redireciona de volta pra cá com `?google=connected|error` — não dá
  // pra saber o resultado de outro jeito, já que o callback roda fora de uma sessão de usuário.
  const [callbackResult, setCallbackResult] = useState<"connected" | "error" | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (result === "connected" || result === "error") {
      setCallbackResult(result);
      params.delete("google");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  }, []);

  if (!googleClientId) {
    return (
      <p className="font-sans text-sm text-text-secondary-warm">
        Integração com Google Calendar ainda não configurada (falta `VITE_GOOGLE_CLIENT_ID`).
      </p>
    );
  }

  if (isLoading) return <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>;

  if (connection) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-sans text-sm text-success">Google Calendar conectado — sincronizando a cada poucos minutos.</p>
        <Button variant="secondary" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-sm text-text-secondary-warm">
        Cria um calendário dedicado "Qqorvex" na sua conta Google e sincroniza seus eventos nos dois sentidos.
      </p>
      <Button variant="primary" onClick={() => connect.mutate()} disabled={connect.isPending}>
        Conectar Google Calendar
      </Button>
      {connect.error && (
        <p className="font-sans text-sm text-error">
          {connect.error instanceof Error ? connect.error.message : "Falha ao iniciar a conexão."}
        </p>
      )}
      {callbackResult === "error" && (
        <p className="font-sans text-sm text-error">
          A conexão com o Google falhou. Confira se a Calendar API está ativada e se seu e-mail está na lista de
          testadores da tela de consentimento, e tente de novo.
        </p>
      )}
    </div>
  );
}
