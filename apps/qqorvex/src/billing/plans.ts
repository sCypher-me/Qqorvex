export const BILLING_PLANS = {
  free: {
    key: "free",
    name: "Free",
    goals: 5,
    habits: 10,
    notebooks: 5,
    mindMaps: 5,
    vexInteractions: 50,
    webSearches: 10,
    documentStorageBytes: 25 * 1024 * 1024,
    maxDocumentFileBytes: 10 * 1024 * 1024,
  },
  plus: {
    key: "plus",
    name: "Qqorvex Plus",
    monthlyPrice: 19.9,
    annualPrice: 214.9,
    goals: null,
    habits: null,
    notebooks: null,
    mindMaps: null,
    vexInteractions: 300,
    webSearches: 60,
    documentStorageBytes: 100 * 1024 * 1024,
    maxDocumentFileBytes: 50 * 1024 * 1024,
  },
} as const;

export type BillingPeriod = "monthly" | "annual";
export function currentBillingMonthSaoPaulo(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Não foi possível determinar o mês de cobrança.");
  return `${year}-${month}-01`;
}
