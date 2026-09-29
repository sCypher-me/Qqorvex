import type { SupabaseClient, Database } from "@qqorvex/database";
import { mapAuthError } from "./authErrors";
import type { OAuthProviderId } from "./oauth";

export interface LinkedIdentity {
  id: string;
  provider: string;
  createdAt: string;
}

export async function listIdentities(client: SupabaseClient<Database>): Promise<LinkedIdentity[]> {
  const { data, error } = await client.auth.getUserIdentities();
  if (error || !data) return [];
  return data.identities.map((i) => ({ id: i.identity_id, provider: i.provider, createdAt: i.created_at ?? "" }));
}

/**
 * Precisa do "Allow manual linking" habilitado no painel do Supabase (Authentication → Sign In /
 * Providers) — sem isso a chamada falha com um erro do próprio Supabase, que já vira mensagem
 * amigável aqui. O linking automático (mesmo e-mail em provedores diferentes) já acontece sozinho
 * no login/cadastro, sem precisar dessa função — `linkIdentity` é só pro caso de "conectar mais um
 * provedor" com o usuário já logado, em Configurações.
 */
export async function linkIdentity(
  client: SupabaseClient<Database>,
  provider: OAuthProviderId,
): Promise<{ error: string | null }> {
  const { error } = await client.auth.linkIdentity({ provider, options: { redirectTo: window.location.origin } });
  return { error: error ? mapAuthError(error) : null };
}

/**
 * O próprio Supabase recusa desconectar a última identidade vinculada (erro dedicado) — a checagem
 * de "pelo menos 2 identidades" no cliente (`useIdentities`) é só UX antecipada, não a garantia real.
 */
export async function unlinkIdentity(
  client: SupabaseClient<Database>,
  identity: LinkedIdentity,
): Promise<{ error: string | null }> {
  const { data } = await client.auth.getUserIdentities();
  const full = data?.identities.find((i) => i.identity_id === identity.id);
  if (!full) return { error: "Não foi possível encontrar essa conexão." };
  const { error } = await client.auth.unlinkIdentity(full);
  if (error) {
    if (error.message.toLowerCase().includes("single identity"))
      return { error: "Esse é seu único método de acesso — configure outro (senha ou provedor) antes de desconectar." };
    return { error: mapAuthError(error) };
  }
  return { error: null };
}
