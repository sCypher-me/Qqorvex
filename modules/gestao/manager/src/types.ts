import type { Tables } from "@qqorvex/database";

/**
 * Painel Manager — só existe pro Dono (`profiles.role === 'dono'`), protegido por RLS
 * (`is_owner()` no banco), não só escondido na UI. `account_tier` não bloqueia nenhuma
 * funcionalidade hoje — é uma etiqueta preparada pro dia que existir um plano pago; "lifetime" e
 * "parceiro" são concedidos só via código de resgate gerado aqui.
 */
export type ProfileRole = "usuario" | "dono";
export type AccountTier = "padrao" | "parceiro" | "lifetime" | "vip";
export type RedemptionCodeTier = "parceiro" | "lifetime" | "beta_tester";

export type RedemptionCode = Tables<"redemption_codes">;

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
}

export interface SystemOverview {
  totalUsers: number;
  totalTasks: number;
  totalEvents: number;
  totalTransactions: number;
  totalDocuments: number;
  totalPages: number;
}
