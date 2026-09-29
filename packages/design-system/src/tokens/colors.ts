/** Primitive palette aliases. Semantic/component usage is defined in tokens.css. */
export const colors = {
  background: "#090B0E",
  surface1: "#101318",
  surface2: "#171B21",
  surface3: "#1E232B",
  border: "#2A3039",

  textPrimary: "#F1F3F5",
  textSecondary: "#D9DDE1",
  textSecondaryWarm: "#D9DDE1",
  textMuted: "#A5ABB4",
  textDisabled: "#707780",

  brandGold: "#B88A54",
  goldBright: "#D2A66F",
  goldMuted: "#73583B",
  brandCyan: "#43B9D2",
  cyanBright: "#72D8EB",
  cyanDark: "#246C7B",

  cyanMuted: "#246C7B",
  warmMuted: "#A5ABB4",

  success: "#32C48D",
  error: "#F05D6C",
  critical: "#D94155",
  warning: "#E7A84B",
  info: "#72D8EB",
} as const;

/** Paleta fechada de categorias (gastos, cadernos, tags) — não estender ad hoc. */
export const categoryColors = [
  "#43B9D2",
  "#6FAF91",
  "#9A7652",
  "#8A7FB5",
  "#5E86C8",
  "#C98C45",
  "#C7786E",
  "#A56D98",
  "#4E9A9A",
  "#687A91",
] as const;

export type ColorToken = keyof typeof colors;
