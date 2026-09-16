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
  displayHero: { family: fontFamilies.display, weight: 700, size: "38px" },
  pageTitle: { family: fontFamilies.display, weight: 600, size: "28px" },
  cardTitle: { family: fontFamilies.display, weight: 600, size: "17px" },
  body: { family: fontFamilies.sans, weight: 400, size: "15px" },
  buttonLabel: { family: fontFamilies.sans, weight: 600, size: "15px" },
  caption: { family: fontFamilies.sans, weight: 500, size: "12.5px" },
  technical: { family: fontFamilies.mono, weight: 500, size: "14px" },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
