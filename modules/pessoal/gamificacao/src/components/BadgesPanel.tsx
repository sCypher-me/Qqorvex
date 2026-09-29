import type { BadgeDefinition } from "../service";
import type { GamificationStats } from "../types";
import { useState } from "react";
import { SpecialBadgeArt } from "./SpecialBadgeArt";
import { TitleBadge } from "./TitleBadge";

export type BadgeWithStatus = BadgeDefinition & { isUnlockedForUser: boolean; unlockedAt?: string | null; subscriptionMonths?: number };

const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });
const BADGE_ACCENTS: Record<string, { accent: string; light: string; core: string }> = {
  "150_tarefas": { accent: "#f07869", light: "#ffc0a0", core: "#382421" },
  "30_checkin_days": { accent: "#70d9c4", light: "#b8fff0", core: "#1c3632" },
  "50_quizzes_90_plus": { accent: "#a9a1ff", light: "#e0dbff", core: "#282541" },
  "50_biblioteca": { accent: "#e9bd75", light: "#ffebbb", core: "#392f20" },
};

function badgeStatus(badge: BadgeWithStatus, stats: GamificationStats | undefined): string {
  if (badge.isUnlockedForUser) {
    return badge.unlockedAt ? `Conquistado em ${monthFormat.format(new Date(badge.unlockedAt)).replace(".", "")}` : "Conquistado";
  }
  if (badge.progressHint) return badge.progressHint;
  if (!stats || !badge.counterField || !badge.target) return "Bloqueado";
  const current = Math.min(Number(stats[badge.counterField] ?? 0), badge.target);
  const remaining = Math.max(0, badge.target - current);
  return `${current} de ${badge.target} · faltam ${remaining}`;
}

function LegacyAchievementBadgeArt({ badgeKey, label, locked }: { badgeKey: string; label: string; locked: boolean }) {
  const palette = BADGE_ACCENTS[badgeKey] ?? { accent: "#70d9e8", light: "#d1fbff", core: "#1c3038" };
  const id = `achievement-${badgeKey.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`Insígnia ${label}`} className={`h-full w-full object-contain transition-[filter,opacity] ${locked ? "opacity-45 grayscale" : "drop-shadow-[0_0_10px_rgba(112,217,232,0.15)]"}`}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette.light} /><stop offset=".48" stopColor={palette.accent} /><stop offset="1" stopColor={palette.core} /></linearGradient>
        <radialGradient id={`${id}-field`} cx="35%" cy="25%" r="90%"><stop stopColor={palette.core} /><stop offset="1" stopColor="#101419" /></radialGradient>
      </defs>
      <path d="M50 4 61 10 73 8 80 19 92 26 90 40 97 50 90 61 92 74 80 81 73 92 60 90 50 97 39 90 26 92 19 80 8 73 10 60 4 50 10 39 8 26 20 19 27 8 40 10Z" fill={`url(#${id}-rim)`} />
      <circle cx="50" cy="50" r="39" fill={`url(#${id}-field)`} stroke={palette.light} strokeOpacity=".72" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="33" fill="none" stroke={palette.accent} strokeOpacity=".85" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="29" fill="none" stroke={palette.light} strokeOpacity=".3" strokeDasharray="1.5 4" />
      <path d="M50 12v5M88 50h-5M50 88v-5M12 50h5M23 23l4 4m46 46 4 4m0-54-4 4m-46 46-4 4" stroke={palette.light} strokeLinecap="round" strokeWidth="1.4" />
      {badgeKey === "150_tarefas" ? (
        <g fill="none" stroke={palette.light} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <path d="m31 50 10 10 28-30" /><path d="M31 68h38" stroke={palette.accent} strokeWidth="2" />
          <circle cx="50" cy="50" r="25" stroke={palette.accent} strokeOpacity=".55" strokeWidth="1.5" />
        </g>
      ) : badgeKey === "30_checkin_days" ? (
        <g fill="none" stroke={palette.light} strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 27v8m0 30v8M27 50h8m30 0h8M34 34l6 6m20 20 6 6m0-32-6 6m-20 20-6 6" stroke={palette.accent} strokeWidth="2" />
          <circle cx="50" cy="50" r="16" stroke={palette.light} strokeWidth="2.5" />
          <path d="m44 50 4 4 8-9" stroke={palette.light} strokeWidth="3" />
        </g>
      ) : badgeKey === "50_quizzes_90_plus" ? (
        <g fill="none" stroke={palette.light} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
          <path d="M25 39 50 27l25 12-25 12-25-12Z" fill={palette.accent} fillOpacity=".2" />
          <path d="M35 45v15c8 7 22 7 30 0V45M75 40v20" />
          <circle cx="75" cy="64" r="3" fill={palette.light} stroke="none" />
          <path d="m43 68 7 7 8-9" stroke={palette.accent} strokeWidth="3" />
        </g>
      ) : (
        <g fill="none" stroke={palette.light} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
          <path d="M50 68c-7-6-16-8-26-7V35c10-1 19 1 26 7 7-6 16-8 26-7v26c-10-1-19 1-26 7Z" fill={palette.accent} fillOpacity=".18" />
          <path d="M50 42v26m-17-21c5 0 9 1 12 3m-12 5c5 0 9 1 12 3m22-11c-5 0-9 1-12 3m12 5c-5 0-9 1-12 3" />
          <path d="m50 24 2.5 5.5 6 .7-4.5 4 1.3 5.8-5.3-3-5.3 3 1.3-5.8-4.5-4 6-.7L50 24Z" fill={palette.light} stroke="none" />
        </g>
      )}
      <circle cx="50" cy="50" r="2" fill={palette.light} />
    </svg>
  );
}

function AchievementBadgeArt({ imageSrc, badgeKey, label, locked }: { imageSrc: string; badgeKey: string; label: string; locked: boolean }) {
  const [assetFailed, setAssetFailed] = useState(false);
  if (assetFailed) return <LegacyAchievementBadgeArt badgeKey={badgeKey} label={label} locked={locked} />;
  return (
    <img
      src={imageSrc}
      alt={`Insígnia ${label}`}
      onError={() => setAssetFailed(true)}
      className={`h-full w-full object-contain transition-[filter,opacity] ${locked ? "opacity-55 grayscale" : "drop-shadow-[0_3px_8px_rgba(234,190,105,0.18)]"}`}
      loading="lazy"
    />
  );
}

/** Tile de conquista: a insígnia fica visível desde o início, mas bloqueada até o marco ser atingido. */
export function BadgeTile({ badge, stats }: { badge: BadgeWithStatus; stats?: GamificationStats }) {
  const got = badge.isUnlockedForUser;
  const current = stats && badge.counterField && badge.target
    ? Math.min(Number(stats[badge.counterField] ?? 0), badge.target)
    : 0;
  const percentage = got ? 100 : badge.progressHint ? 0 : badge.target ? Math.min(100, Math.round((current / badge.target) * 100)) : 0;
  return (
    <div
      className={`relative overflow-hidden rounded-[16px] border p-4 transition-colors ${
        got ? "border-gold/80 bg-[linear-gradient(145deg,rgba(54,40,25,0.8),rgba(17,20,24,0.96))]" : "border-line bg-canvas/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-20 w-20 shrink-0">
          {badge.subscriptionMonths != null ? (
            <SpecialBadgeArt badge={badge} locked={!got} className="h-full w-full" />
          ) : (
            <AchievementBadgeArt imageSrc={badge.imageSrc} badgeKey={badge.key} label={badge.label} locked={!got} />
          )}
        </div>
        <span className={`rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${got ? "border-success/40 bg-success-soft text-success" : "border-line bg-surface text-fg-3"}`}>
          {got ? "Conquistada" : "Bloqueada"}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <span className="text-sm font-semibold leading-[1.3] text-fg">{badge.label}</span>
        <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] text-fg-3">Título</span><TitleBadge title={badge.title} size="sm" /></div>
        <span className="text-xs leading-[1.45] text-fg-2">{badge.description}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-raised">
          <div className={`h-full rounded-full transition-[width] ${got ? "bg-gold" : "bg-gold"}`} style={{ width: `${got ? 100 : percentage}%` }} />
        </div>
        <span className={`font-mono text-[11px] ${got ? "text-gold-fg" : "text-fg-2"}`}>
        {badgeStatus(badge, stats)}
        </span>
      </div>
    </div>
  );
}

/**
 * Grade de conquistas (Perfil e Gamificação). A mesma visualização deixa claro o requisito,
 * progresso, título e insígnia que será liberada.
 */
export function BadgesPanel({ badges, stats }: { badges: BadgeWithStatus[]; stats?: GamificationStats }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-3.5">
      {badges.map((badge) => (
        <BadgeTile key={badge.key} badge={badge} stats={stats} />
      ))}
    </div>
  );
}
