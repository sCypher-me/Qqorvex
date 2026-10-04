
/** Paleta fechada de categorias (tags, gráficos, cadernos) — não estender ad hoc. */
const categoryColors = [
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
