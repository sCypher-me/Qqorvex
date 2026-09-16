import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createGoogleOAuthState, disconnectGoogleCalendar, getGoogleCalendarConnection } from "../repository";
import { buildGoogleAuthUrl } from "../service";

const CONNECTION_KEY = ["google-calendar-connection"] as const;

export function useGoogleCalendarConnection(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: CONNECTION_KEY, queryFn: () => getGoogleCalendarConnection(client) });
  return { connection: query.data ?? null, isLoading: query.isLoading };
}

/**
 * Gera o token de estado opaco e redireciona pro consentimento do Google — não é uma mutation
 * comum porque o "resultado" é sair da página, não uma resposta pra tratar aqui. O retorno
 * acontece via `google-oauth-callback`, que redireciona de volta pro app.
 */
export function useConnectGoogleCalendar(client: SupabaseClient<Database>, userId: string, redirectUri: string, clientId: string) {
  return useMutation({
    mutationFn: async () => {
      const state = await createGoogleOAuthState(client, userId);
      window.location.href = buildGoogleAuthUrl({ clientId, redirectUri, state });
    },
  });
}

export function useDisconnectGoogleCalendar(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectGoogleCalendar(client, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTION_KEY }),
  });
}
