import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Notice } from "@qqorvex/ui";
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
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Integração com Google Calendar ainda não configurada (falta <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span>).
      </p>
    );
  }

  if (isLoading) return <p className="text-[13px] text-text-secondary">Carregando...</p>;

  if (connection) {
    return (
      <div className="flex flex-col gap-3 items-start">
        <span className="qv-pill qv-pill-success">Google Calendar conectado — sincronizando a cada poucos minutos</span>
        <Button type="button" variant="secondary" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 items-start">
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Cria um calendário dedicado "Qqorvex" na sua conta Google e sincroniza seus eventos nos dois sentidos.
      </p>
      <Button type="button" variant="primary" size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
        Conectar Google Calendar
      </Button>
      {connect.error && (
        <Notice tone="error" className="w-full">
          {connect.error instanceof Error ? connect.error.message : "Falha ao iniciar a conexão."}
        </Notice>
      )}
      {callbackResult === "error" && (
        <Notice tone="error" className="w-full" title="A conexão com o Google falhou">
          A conexão com o Google falhou. Confira se a Calendar API está ativada e se seu e-mail está na lista de
          testadores da tela de consentimento, e tente de novo.
        </Notice>
      )}
    </div>
  );
}
