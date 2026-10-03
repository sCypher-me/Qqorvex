import type { SupabaseClient, Database } from "@qqorvex/database";
import type { ManagedAccount, NewRedemptionCodeInput, PartnerCampaign, PartnerCampaignInput, RedeemResult, RedemptionCode, RedemptionCodeTier, SystemOverview } from "./types";

type Client = SupabaseClient<Database>;

/** `list_all_accounts()` só retorna linhas pro dono (where is_owner()) — usuário comum recebe vazio. */
export async function listAllAccounts(client: Client): Promise<ManagedAccount[]> {
  const { data, error } = await client.rpc("list_all_accounts");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name,
    username: row.username,
    role: row.role as ManagedAccount["role"],
    accountTier: row.account_tier as ManagedAccount["accountTier"],
    createdAt: row.created_at,
  }));
}

/** Nunca permite excluir a própria conta por aqui (a função no banco já recusa). */
export async function deleteAccount(client: Client, targetUserId: string): Promise<void> {
  const { error } = await client.rpc("delete_account", { target_user_id: targetUserId });
  if (error) throw error;
}

/** `get_system_overview()` só retorna algo pro Dono — usuário comum recebe zero linhas (where is_owner()). */
export async function getSystemOverview(client: Client): Promise<SystemOverview | null> {
  const { data, error } = await client.rpc("get_system_overview");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    totalUsers: row.total_users,
    totalTasks: row.total_tasks,
    totalEvents: row.total_events,
    totalTransactions: row.total_transactions,
    totalDocuments: row.total_documents,
    totalPages: row.total_pages,
  };
}

export async function listRedemptionCodes(client: Client): Promise<RedemptionCode[]> {
  const { data, error } = await client.from("redemption_codes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `QQ-${part()}-${part()}`;
}

/** Insert direto (não RPC) — protegido pela mesma policy `redemption_codes_owner_all` do dono. */
export async function createRedemptionCode(client: Client, userId: string, input: NewRedemptionCodeInput): Promise<RedemptionCode> {
  const { data, error } = await client
    .from("redemption_codes")
    .insert({ code: generateCode(), tier: input.tier, note: input.note ?? null, created_by: userId, campaign_id: input.tier === "parceiro" ? (input.campaignId ?? null) : null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

const REDEEM_TIERS: readonly RedemptionCodeTier[] = ["parceiro", "lifetime", "beta_tester"];

/** Valida a resposta de `redeem_code()` (jsonb). Formato inesperado vira erro genérico. */
export function parseRedeemResult(raw: unknown): RedeemResult {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (value.ok === true && REDEEM_TIERS.includes(value.tier as RedemptionCodeTier)) {
    return {
      ok: true,
      tier: value.tier as RedemptionCodeTier,
      partnerUntil: typeof value.partner_until === "string" ? value.partner_until : null,
      partnerCampaign: typeof value.partner_campaign === "string" ? value.partner_campaign : null,
    };
  }
  return { ok: false, error: typeof value.error === "string" && value.error ? value.error : "Não foi possível ativar o código." };
}

/**
 * `redeem_code()` valida o código, aplica o acesso e já concede a insígnia (Lifetime/Beta) numa
 * transação só. Erros esperados (código inválido, muitas tentativas) voltam como `ok: false`.
 */
export async function redeemCode(client: Client, code: string): Promise<RedeemResult> {
  const { data, error } = await client.rpc("redeem_code", { input_code: code });
  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
  return parseRedeemResult(data);
}

/** Campanhas de Parceiro — RLS só deixa o Dono ler e escrever. */
export async function listPartnerCampaigns(client: Client): Promise<PartnerCampaign[]> {
  const { data, error } = await client.from("partner_campaigns").select("*").order("ends_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPartnerCampaign(client: Client, userId: string, input: PartnerCampaignInput): Promise<PartnerCampaign> {
  const { data, error } = await client
    .from("partner_campaigns")
    .insert({ name: input.name.trim(), ends_at: input.endsAt, created_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Estender ou encerrar (data no passado) vale para todos os parceiros da campanha na hora. */
export async function updatePartnerCampaignEnd(client: Client, campaignId: string, endsAt: string): Promise<PartnerCampaign> {
  const { data, error } = await client.from("partner_campaigns").update({ ends_at: endsAt }).eq("id", campaignId).select("*").single();
  if (error) throw error;
  return data;
}

export interface SecretKeyStatus {
  key: string;
  hasValue: boolean;
  updatedAt: string | null;
}

export async function listSecretKeys(client: Client): Promise<SecretKeyStatus[]> {
  const { data, error } = await client.rpc("list_secret_keys");
  if (error) throw error;
  return (data ?? []).map((row) => ({ key: row.key, hasValue: row.has_value, updatedAt: row.updated_at }));
}

/** Write-only de propósito — `set_secret()` nunca devolve o valor de volta, só grava. */
export async function setSecret(client: Client, key: string, value: string): Promise<void> {
  const { error } = await client.rpc("set_secret", { input_key: key, input_value: value });
  if (error) throw error;
}
