import { useEffect, useState } from "react";
import { CheckCircleIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Notice, Skeleton } from "@qqorvex/ui";
import { useConnectGoogleCalendar, useDisconnectGoogleCalendar, useGoogleCalendarConnection } from "../hooks/useGoogleCalendar";

/**
 * Sincronização bidirecional com um calendário "Qqorvex" dedicado na conta Google (não o
 * calendário pessoal). Desconectar só apaga a conexão — nenhum evento é removido.
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
  const connect = useConnectGoogleCalendar(client, userId, `${supabaseUrl}/functions/v1/google-oauth-callback`, googleClientId ?? "");
  const disconnect = useDisconnectGoogleCalendar(client);
  const [callbackResult, setCallbackResult] = useState<"connected" | "error" | null>(null);

  // O callback do Google volta para o app com `?google=connected|error`.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (result === "connected" || result === "error") {
      setCallbackResult(result);
      params.delete("google");
      const search = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (search ? `?${search}` : ""));
    }
  }, []);

  return (
    <div className="flex items-start gap-4 rounded-xl border border-line p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2">
        <GoogleLogoIcon size={20} weight="bold" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-[14px] font-semibold text-fg">Google Calendar</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-fg-3">Sincroniza nos dois sentidos com um calendário “Qqorvex” dedicado na sua conta Google.</p>
        </div>
        {!googleClientId ? (
          <p className="text-xs text-fg-4">Integração ainda não habilitada neste ambiente.</p>
        ) : isLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : connection ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-success">
              <CheckCircleIcon size={16} weight="fill" /> Conectado
            </span>
            <Button variant="ghost" size="sm" loading={disconnect.isPending} onClick={() => disconnect.mutate()}>
              Desconectar
            </Button>
          </div>
        ) : (
          <Button size="sm" className="self-start" loading={connect.isPending} onClick={() => connect.mutate()}>
            Conectar Google Calendar
          </Button>
        )}
        {callbackResult === "connected" && <Notice tone="success" compact>Conta Google conectada. Os eventos aparecem em alguns minutos.</Notice>}
        {(callbackResult === "error" || connect.error) && (
          <Notice compact>A conexão com o Google não foi concluída. Tente novamente em instantes.</Notice>
        )}
        {disconnect.error && <Notice compact>Não foi possível desconectar agora.</Notice>}
      </div>
    </div>
  );
}
