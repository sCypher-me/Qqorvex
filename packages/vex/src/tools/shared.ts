/**
 * Utilitários comuns às ferramentas da Vex. Tudo em horário LOCAL: `toISOString().slice(0, 10)`
 * devolve a data em UTC e, no Brasil, vira "amanhã" depois das 21h.
 */

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(dateKey: string, amount: number): string {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + amount));
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 1, d = 1] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

/** Data local + "HH:MM" → Date local. */
export function localDateTime(dateKey: string, time: string): Date {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "hoje", "amanhã", "ontem" ou "sex., 2 de out." */
export function formatDateKey(dateKey: string, today = localDateKey()): string {
  if (dateKey === today) return "hoje";
  if (dateKey === addDays(today, 1)) return "amanhã";
  if (dateKey === addDays(today, -1)) return "ontem";
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type NameMatch<T> = { kind: "one"; item: T } | { kind: "none" } | { kind: "many"; items: T[] };

/**
 * Encontra um item pelo nome sem adivinhar: igual (ignorando acentos) vence; senão "contém";
 * se sobrar mais de um candidato, devolve a lista para a Vex perguntar qual é.
 */
export function matchByName<T>(items: T[], query: string, nameOf: (item: T) => string): NameMatch<T> {
  const target = normalize(query);
  if (!target) return { kind: "none" };
  const exact = items.filter((item) => normalize(nameOf(item)) === target);
  if (exact.length === 1) return { kind: "one", item: exact[0]! };
  const partial = exact.length > 1 ? exact : items.filter((item) => normalize(nameOf(item)).includes(target));
  if (partial.length === 1) return { kind: "one", item: partial[0]! };
  if (partial.length === 0) return { kind: "none" };
  return { kind: "many", items: partial.slice(0, 8) };
}

export function ambiguousSummary<T>(what: string, items: T[], nameOf: (item: T) => string): string {
  return `Encontrei mais de ${what} com esse nome: ${items.map((item) => `"${nameOf(item)}"`).join(", ")}. Pergunte à pessoa qual delas.`;
}
