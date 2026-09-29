/**
 * Hierarquia tipográfica oficial. Fonte de verdade: Xmind "Qqorvex" > Tipografia Oficial.
 * Space Grotesk = display/títulos · Manrope = interface/leitura · JetBrains Mono = dados técnicos.
 */
export const fontFamilies = {
  display: "'Space Grotesk', sans-serif",
  sans: "'Manrope', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const typeScale = {
  displayHero: { family: fontFamilies.display, weight: 700, size: "40px" },
  pageTitle: { family: fontFamilies.display, weight: 600, size: "32px" },
  sectionTitle: { family: fontFamilies.display, weight: 600, size: "24px" },
  cardTitle: { family: fontFamilies.display, weight: 600, size: "16px" },
  body: { family: fontFamilies.sans, weight: 400, size: "15px" },
  buttonLabel: { family: fontFamilies.sans, weight: 600, size: "15px" },
  secondary: { family: fontFamilies.sans, weight: 400, size: "13px" },
  label: { family: fontFamilies.sans, weight: 600, size: "12px" },
  caption: { family: fontFamilies.sans, weight: 500, size: "11px" },
  metric: { family: fontFamilies.mono, weight: 500, size: "30px" },
  technical: { family: fontFamilies.mono, weight: 500, size: "14px" },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
