import type { BadgeDefinition } from "../service";
import type { GamificationStats } from "../types";

export type BadgeWithStatus = BadgeDefinition & { isUnlockedForUser: boolean; unlockedAt?: string | null };

const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });

/** Iniciais do nome da badge: 1ª letra das duas primeiras palavras, ou as duas primeiras letras se for uma palavra só. */
export function badgeInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const [first = "", second] = words;
  if (second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

function badgeStatus(badge: BadgeWithStatus, stats: GamificationStats | undefined): string {
  if (badge.isUnlockedForUser) {
    return badge.unlockedAt ? `Conquistado em ${monthFormat.format(new Date(badge.unlockedAt)).replace(".", "")}` : "Conquistado";
  }
  if (!stats) return "Bloqueado";
  return `${Math.min(stats[badge.counterField], badge.target)} de ${badge.target}`;
}

/** Tile de badge do design (quadrado de iniciais ouro com brilho quando conquistada, neutro quando não). */
export function BadgeTile({ badge, stats }: { badge: BadgeWithStatus; stats?: GamificationStats }) {
  const got = badge.isUnlockedForUser;
  return (
    <div
      className={`bg-vex-graphite border rounded-[14px] p-4 flex flex-col gap-2.5 ${
        got ? "border-[rgba(184,138,84,.42)]" : "border-border"
      }`}
    >
      <span
        aria-hidden
        className={`w-[42px] h-[42px] rounded-md flex items-center justify-center font-mono text-[13px] font-semibold ${
          got
            ? "bg-[rgba(184,138,84,.16)] text-vex-gold-bright shadow-[0_0_18px_rgba(210,166,111,.22)]"
            : "bg-surface-3 text-text-secondary"
        }`}
      >
        {badgeInitials(badge.label)}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold leading-[1.3]">{badge.label}</span>
        <span className="text-xs text-text-secondary leading-[1.45]">{badge.description}</span>
      </div>
      <span className={`font-mono text-[11px] ${got ? "text-vex-gold-bright" : "text-text-secondary"}`}>
        {badgeStatus(badge, stats)}
      </span>
    </div>
  );
}

/**
 * Grade de badges (Perfil e Gamificação) — badge não desbloqueada aparece neutra, sem toast em
 * tempo real na v1. `stats` é opcional: com ele, badges bloqueadas mostram o progresso "N de M".
 */
export function BadgesPanel({ badges, stats }: { badges: BadgeWithStatus[]; stats?: GamificationStats }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-3.5">
      {badges.map((badge) => (
        <BadgeTile key={badge.key} badge={badge} stats={stats} />
      ))}
    </div>
  );
}
