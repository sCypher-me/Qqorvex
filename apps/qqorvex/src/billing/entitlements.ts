export type PlusSubscriptionSnapshot = {
  plan_key: string;
  status: string;
  current_period_end: string | null;
};

/** Entitlement follows the server-synced subscription window, including cancellation at period end. */
export function hasPlusEntitlement(
  subscription: PlusSubscriptionSnapshot | null | undefined,
  now = Date.now(),
  isOwner = false,
): boolean {
  // Owner entitlement is mirrored by the protected `profiles.role` check in Supabase.
  if (isOwner) return true;
  if (!subscription || subscription.plan_key !== "plus") return false;
  if (!["active", "trialing", "canceled"].includes(subscription.status)) return false;
  const periodEnd = subscription.current_period_end ? Date.parse(subscription.current_period_end) : Number.NaN;
  return Number.isFinite(periodEnd) && periodEnd > now;
}

/**
 * Nível de acesso devolvido por `get_my_access()`: Free < Plus < Ilimitado. Ilimitado é o Dono,
 * quem tem Lifetime e o Parceiro com campanha ativa — passa em tudo que o Plus libera e não tem
 * nenhuma cota.
 */
export type AccessLevel = "free" | "plus" | "unlimited";
export type AccessSource = "dono" | "lifetime" | "parceiro" | "plus" | null;

export interface AccountAccess {
  level: AccessLevel;
  source: AccessSource;
  /** Fim da campanha de Parceiro (também quando já terminou, para avisar). */
  partnerUntil: string | null;
  partnerCampaign: string | null;
}

const LEVELS: readonly AccessLevel[] = ["free", "plus", "unlimited"];
const SOURCES: readonly NonNullable<AccessSource>[] = ["dono", "lifetime", "parceiro", "plus"];

/** Valida a resposta do servidor; qualquer formato inesperado vira `null` (trate como "sem dado"). */
export function parseAccountAccess(raw: unknown): AccountAccess | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (!LEVELS.includes(value.level as AccessLevel)) return null;
  const source = SOURCES.includes(value.source as NonNullable<AccessSource>) ? (value.source as AccessSource) : null;
  return {
    level: value.level as AccessLevel,
    source,
    partnerUntil: typeof value.partner_until === "string" ? value.partner_until : null,
    partnerCampaign: typeof value.partner_campaign === "string" ? value.partner_campaign : null,
  };
}

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

/** Rótulo curto do acesso (menu da conta, Assinatura); `null` para Free. */
export function accessLabel(access: AccountAccess | null): string | null {
  switch (access?.source) {
    case "dono":
      return "Dono";
    case "lifetime":
      return "Lifetime";
    case "parceiro":
      return access.partnerUntil ? `Parceiro até ${shortDate.format(new Date(access.partnerUntil))}` : "Parceiro";
    case "plus":
      return "Plus";
    default:
      return null;
  }
}
