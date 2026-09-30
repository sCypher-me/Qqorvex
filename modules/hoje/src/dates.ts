/**
 * Data civil local em YYYY-MM-DD. Os providers usam isto em vez de `toISOString().slice(0, 10)`,
 * que devolve o dia em UTC — no horário de Brasília, das 21h à meia-noite, isso já é amanhã.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Dia local daqui a `days` dias (negativo para o passado), em YYYY-MM-DD. */
export function localDateKeyInDays(days: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}
