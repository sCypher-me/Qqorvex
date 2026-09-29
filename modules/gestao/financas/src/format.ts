import { categoryColor } from "@qqorvex/design-system";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "R$ 1.234,56" (sempre valor absoluto). */
export function formatBRL(value: number): string {
  return brl.format(Math.abs(value));
}

/** "R$ 1,2 mil" para eixos e rótulos compactos. */
export function formatBRLCompact(value: number): string {
  return brlCompact.format(value);
}

/** "+ R$ 920,00" / "− R$ 312,44" (sinal de menos tipográfico). */
export function formatSignedBRL(value: number, sign: "+" | "-" | ""): string {
  return sign === "" ? formatBRL(value) : `${sign === "+" ? "+" : "−"} ${formatBRL(value)}`;
}

/** "15 set" a partir de `YYYY-MM-DD`. */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1] ?? ""}`;
}

/** "setembro de 2026" a partir de `YYYY-MM`. */
export function formatMonthLong(yearMonth: string): string {
  const [year = 0, month = 1] = yearMonth.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthShort(yearMonth: string): string {
  const [, month = 1] = yearMonth.split("-").map(Number);
  return MONTHS_SHORT[month - 1] ?? yearMonth;
}

/** Cor estável de uma categoria (paleta fechada). Sem categoria = neutro. */
export function financeCategoryColor(categoryId: string | null | undefined): string {
  return categoryId ? categoryColor(categoryId) : "var(--q-fg-4)";
}
