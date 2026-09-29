/**
 * Badges de acesso especial. Eles ficam separados das conquistas porque não
 * são liberados por XP ou por contadores de gamificação.
 *
 * Os acessos são sincronizados por `sync_my_gamification_badges()` no Supabase.
 */
export type SpecialBadgeAccess = "lifetime" | "beta_tester" | "owner" | "plus" | "annual" | "subscription_tenure";

export interface SpecialBadgeDefinition {
  key: string;
  label: string;
  description: string;
  /** Título exibido junto ao badge quando ele for concedido. */
  title: string;
  imageSrc: string;
  access: SpecialBadgeAccess;
  /** Preenchido apenas nos badges evolutivos de tempo de assinatura. */
  subscriptionMonths?: number;
  /** Requisito curto exibido no estado bloqueado da galeria. */
  progressHint: string;
}

const subscriptionMonths = Array.from({ length: 50 }, (_, index) => index + 1);

function monthLabel(months: number): string {
  return months === 1 ? "1 mês" : `${months} meses`;
}

/** Badges especiais separados das quatro conquistas de marcos. */
export const SPECIAL_BADGE_CATALOG: readonly SpecialBadgeDefinition[] = [
  {
    key: "amigo_lifetime",
    label: "Amigo Lifetime",
    description: "Reservado para usuários com acesso Lifetime.",
    title: "Amigo do Qqorvex",
    imageSrc: "/brand/badges/special/amigos-lifetime-v2.png",
    access: "lifetime",
    progressHint: "Desbloqueie o acesso Lifetime.",
  },
  {
    key: "beta_tester",
    label: "Beta Tester",
    description: "Reservado para participantes oficiais do beta.",
    title: "Pioneiro",
    imageSrc: "/brand/badges/special/beta-tester-v2.png",
    access: "beta_tester",
    progressHint: "Participe do beta e resgate um código oficial.",
  },
  {
    key: "dono",
    label: "Dono",
    description: "Badge exclusivo da conta do dono do Qqorvex.",
    title: "Dono",
    imageSrc: "/brand/badges/special/dono-qqorvex.png",
    access: "owner",
    progressHint: "Exclusivo da conta do dono.",
  },
  {
    key: "vip_plus",
    label: "Qqorvex Plus",
    description: "Insígnia permanente para quem já apoiou o Qqorvex com uma assinatura Plus ativa.",
    title: "Apoiador Plus",
    imageSrc: "/brand/badges/special/vip-plus.png",
    access: "plus",
    progressHint: "Ative uma assinatura Qqorvex Plus.",
  },
  {
    key: "assinante_anual",
    label: "Assinante anual",
    description: "Reservado para usuários com assinatura anual.",
    title: "Anual",
    imageSrc: "/brand/badges/special/anual-v2.png",
    access: "annual",
    progressHint: "Mantenha uma assinatura Plus anual ativa.",
  },
  ...subscriptionMonths.map((months): SpecialBadgeDefinition => ({
    key: `assinatura_${String(months).padStart(2, "0")}_meses`,
    label: `Assinante · ${monthLabel(months)}`,
    description: `Concedido ao atingir ${monthLabel(months)} desde a primeira assinatura Plus registrada.`,
    title: `Assinante · ${monthLabel(months)}`,
    imageSrc: "/brand/badges/tempo-assinatura/tenure-v2.png",
    access: "subscription_tenure",
    subscriptionMonths: months,
    progressHint: `Assine o Plus e alcance ${monthLabel(months)} de jornada.`,
  })),
];

/** Retorna o badge correspondente ao maior marco já atingido. */
export function getSubscriptionTenureBadge(subscriptionMonthsActive: number): SpecialBadgeDefinition | null {
  const safeMonths = Math.max(0, Math.floor(subscriptionMonthsActive));
  if (safeMonths < 1) return null;
  return (
    [...SPECIAL_BADGE_CATALOG]
      .filter((badge) => badge.access === "subscription_tenure" && (badge.subscriptionMonths ?? 0) <= safeMonths)
      .sort((a, b) => (b.subscriptionMonths ?? 0) - (a.subscriptionMonths ?? 0))[0] ?? null
  );
}
