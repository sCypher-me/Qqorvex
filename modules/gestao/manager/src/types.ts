import type { Tables } from "@qqorvex/database";

/**
 * Painel Manager — só existe pro Dono (`profiles.role === 'dono'`), protegido por RLS
 * (`is_owner()` no banco), não só escondido na UI. "lifetime" (acesso ilimitado para sempre) e
 * "parceiro" (ilimitado enquanto a campanha durar) só nascem de código de resgate gerado aqui —
 * nunca de compra. O resgate fica escondido no app (toque 7x na estrela).
 */
export type ProfileRole = "usuario" | "dono";
export type AccountTier = "padrao" | "parceiro" | "lifetime" | "vip";
export type RedemptionCodeTier = "parceiro" | "lifetime" | "beta_tester";

export type RedemptionCode = Tables<"redemption_codes">;
export type PartnerCampaign = Tables<"partner_campaigns">;

export interface ManagedAccount {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  role: ProfileRole;
  accountTier: AccountTier;
  createdAt: string;
}

export interface NewRedemptionCodeInput {
  /** VIP é um status administrativo e não pode ser emitido por código público. */
  tier: RedemptionCodeTier;
  note?: string;
  /** Obrigatória para Parceiro: o acesso acaba quando a campanha acaba. */
  campaignId?: string;
}

export interface PartnerCampaignInput {
  name: string;
  /** Fim da campanha (ISO). */
  endsAt: string;
}

/** Resultado de `redeem_code()`: recusas não gastam o código. */
export type RedeemResult =
  | { ok: true; tier: RedemptionCodeTier; partnerUntil: string | null; partnerCampaign: string | null }
  | { ok: false; error: string };

export interface SystemOverview {
  totalUsers: number;
  totalTasks: number;
  totalEvents: number;
  totalTransactions: number;
  totalDocuments: number;
  totalPages: number;
}
