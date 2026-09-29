/**
 * Referências de cor para uso em JS (gráficos SVG, canvas, estilos inline dinâmicos). Sempre que
 * possível use as variáveis CSS (`var(--q-*)`) — elas acompanham tema claro/escuro e skins; os hex
 * abaixo são só o valor padrão do tema escuro.
 */
export const cssVar = {
  canvas: "var(--q-canvas)",
  surface: "var(--q-surface)",
  raised: "var(--q-raised)",
  line: "var(--q-line)",
  lineSoft: "var(--q-line-soft)",
  fg: "var(--q-fg)",
  fg2: "var(--q-fg-2)",
  fg3: "var(--q-fg-3)",
  fg4: "var(--q-fg-4)",
  gold: "var(--q-gold)",
  goldFg: "var(--q-gold-fg)",
  goldSoft: "var(--q-gold-soft)",
  ai: "var(--q-ai)",
  aiSoft: "var(--q-ai-soft)",
  success: "var(--q-success)",
  danger: "var(--q-danger)",
  warning: "var(--q-warning)",
  info: "var(--q-info)",
} as const;

/** Paleta fechada de categorias (tags, gráficos, cadernos) — não estender ad hoc. */
export const categoryColors = [
  "var(--q-cat-1)",
  "var(--q-cat-2)",
  "var(--q-cat-3)",
  "var(--q-cat-4)",
  "var(--q-cat-5)",
  "var(--q-cat-6)",
  "var(--q-cat-7)",
  "var(--q-cat-8)",
] as const;

export function categoryColor(key: string | number): string {
  const text = String(key);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return categoryColors[hash % categoryColors.length]!;
}

export const brand = {
  ink: "#100f0e",
  cream: "#f3ebdd",
  gold: "#d4a056",
  vexTeal: "#5fc2c0",
} as const;
