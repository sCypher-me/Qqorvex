import type { BadgeDefinition } from "../service";

/** Seção de badges em /seguranca (Perfil) — badge não desbloqueada aparece esmaecida, sem toast em tempo real na v1. */
export function BadgesPanel({ badges }: { badges: (BadgeDefinition & { isUnlockedForUser: boolean })[] }) {
  return (
    <div className="w-full flex flex-col gap-2">
      <h3 className="font-display text-sm font-semibold text-text-primary">Badges</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className={`border rounded-md p-2 flex flex-col gap-1 ${
              badge.isUnlockedForUser ? "border-brand-cyan bg-surface-2" : "border-border bg-surface-1 opacity-50"
            }`}
          >
            <p className="font-sans text-sm text-text-primary">{badge.isUnlockedForUser ? "🏅" : "🔒"} {badge.label}</p>
            <p className="font-sans text-xs text-text-secondary-warm">{badge.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
