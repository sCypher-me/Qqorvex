import type { SpecialBadgeDefinition } from "../specialBadges";

type SpecialBadgeArtData = Pick<SpecialBadgeDefinition, "imageSrc" | "label" | "subscriptionMonths">;

/** Arte compartilhada dos badges especiais; o número mensal é texto real, não parte do PNG. */
export function SpecialBadgeArt({
  badge,
  className = "",
  locked = false,
}: {
  badge: SpecialBadgeArtData;
  className?: string;
  locked?: boolean;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center transition-[filter,opacity] ${locked ? "opacity-55 grayscale" : ""} ${className}`}
      style={{ containerType: "size" }}
      title={badge.label}
    >
      <img
        src={badge.imageSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="col-start-1 row-start-1 h-full w-full object-contain"
      />
      {badge.subscriptionMonths != null && (
        <span
          aria-hidden="true"
          className="relative z-10 col-start-1 row-start-1 font-display font-bold leading-none tracking-tight text-gold-fg [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]"
          style={{ fontSize: "32cqw" }}
        >
          {badge.subscriptionMonths}
        </span>
      )}
    </span>
  );
}
