/**
 * Paleta oficial do Qqorvex. Fonte de verdade: Xmind "Qqorvex" > Paleta Oficial / Cores Semânticas.
 * Usar estes tokens (via Tailwind classes ou aqui) em vez de cores literais nos módulos.
 */
export const colors = {
  background: "#0F1114",
  surface1: "#14181A",
  surface2: "#152124",
  border: "#2D2D2D",

  textPrimary: "#F4EFE6",
  textSecondaryWarm: "#CFAFA2",

  brandGold: "#CF9C49",
  brandCyan: "#00E6FB",

  cyanMuted: "#64ADB4",
  warmMuted: "#635752",

  success: "#4ADE80",
  error: "#FF5D73",
  warning: "#F4C95D",
  info: "#5EBBFF",
} as const;

export type ColorToken = keyof typeof colors;
