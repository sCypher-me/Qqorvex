
const typeScale = {
  hero: "font-display text-[34px] leading-[1.1] font-semibold tracking-[-0.02em]",
  pageTitle: "font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.015em]",
  sectionTitle: "font-display text-[17px] leading-snug font-semibold",
  cardTitle: "text-[14px] leading-snug font-semibold",
  body: "text-[14px] leading-relaxed",
  small: "text-[13px] leading-normal",
  caption: "text-[12px] leading-normal",
  eyebrow: "text-2xs font-semibold uppercase tracking-[0.08em]",
  metric: "font-display text-[28px] leading-none font-semibold tabular-nums",
} as const;

export type TypeScaleToken = keyof typeof typeScale;
