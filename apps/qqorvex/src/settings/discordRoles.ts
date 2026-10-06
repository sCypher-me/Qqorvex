import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database, SupabaseClient } from "@qqorvex/database";

type Client = SupabaseClient<Database>;

/** Conexão do Discord para os cargos vinculados do servidor do Qqorvex. Tokens nunca chegam ao navegador. */
export interface DiscordConnection {
  username: string;
  roles: DiscordRoles;
  syncedAt: string | null;
}

export interface DiscordRoles {
  beta_tester: boolean;
  plus: boolean;
  lifetime: boolean;
  parceiro: boolean;
}

export const DISCORD_ROLE_LABELS: Record<keyof DiscordRoles, string> = {
  beta_tester: "Beta Tester",
  plus: "Plus",
  lifetime: "Amigo Lifetime",
  parceiro: "Parceiro",
};

/** Resultado do retorno do Discord (`?discord=` em Configurações → Conexões). */
export type DiscordLinkResult = "connected" | "cancelled" | "error" | "start";

export function parseDiscordLinkParam(value: string | null): DiscordLinkResult | null {
  if (value === "connected" || value === "cancelled" || value === "error") return value;
  // `conectar` é o que o Discord abre quando a pessoa pede os cargos vinculados pelo próprio Discord.
  if (value === "conectar") return "start";
  return null;
}

/** Valida a resposta de get_my_discord_connection(); formato inesperado vira `null`. */
export function parseDiscordConnection(raw: unknown): DiscordConnection | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.username !== "string") return null;
  const roles = (value.roles && typeof value.roles === "object" ? value.roles : {}) as Record<string, unknown>;
  return {
    username: value.username,
    roles: {
      beta_tester: roles.beta_tester === true,
      plus: roles.plus === true,
      lifetime: roles.lifetime === true,
      parceiro: roles.parceiro === true,
    },
    syncedAt: typeof value.synced_at === "string" ? value.synced_at : null,
  };
}

export function activeRoleLabels(roles: DiscordRoles): string[] {
  return (Object.keys(DISCORD_ROLE_LABELS) as Array<keyof DiscordRoles>).filter((key) => roles[key]).map((key) => DISCORD_ROLE_LABELS[key]);
}

async function invokeDiscordLink<T>(client: Client, action: "start" | "disconnect"): Promise<T> {
  const { data, error } = await client.functions.invoke("discord-link", { body: { action } });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") throw new Error(data.error);
  return data as T;
}

const CONNECTION_KEY = ["discord-connection"] as const;

export function useDiscordConnection(client: Client) {
  const query = useQuery({
    queryKey: CONNECTION_KEY,
    queryFn: async () => {
      const { data, error } = await client.rpc("get_my_discord_connection");
      if (error) throw error;
      return parseDiscordConnection(data);
    },
  });
  return { connection: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

/**
 * Pede ao servidor a URL de autorização (com `state` de uso único) e sai da página para o Discord.
 * O retorno acontece via `discord-link-callback`, que redireciona para Configurações → Conexões.
 */
export function useConnectDiscord(client: Client) {
  return useMutation({
    mutationFn: async () => {
      const { url } = await invokeDiscordLink<{ url: string }>(client, "start");
      window.location.href = url;
    },
  });
}

export function useDisconnectDiscord(client: Client) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeDiscordLink<{ connected: false }>(client, "disconnect"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTION_KEY }),
  });
}
