import { addMonthsToDate, formatLocalDate, projectRecurringOccurrences } from "./service";
import type { RecurringTransaction, Transaction } from "./types";

/* ───────────────────── Evolução e composição ───────────────────── */

export interface MonthTotals {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

/** Últimos N meses (terminando em `endMonth`), só movimentações concluídas; transferências fora. */
export function monthlyTotals(transactions: Transaction[], endMonth: string, count = 6): MonthTotals[] {
  const months = Array.from({ length: count }, (_, index) => addMonthsToDate(`${endMonth}-01`, index - count + 1).slice(0, 7));
  const totals = new Map(months.map((month) => [month, { month, income: 0, expense: 0 }]));
  for (const transaction of transactions) {
    if (transaction.status !== "concluida" || transaction.transaction_type === "transferencia") continue;
    const entry = totals.get(transaction.date.slice(0, 7));
    if (!entry) continue;
    if (transaction.transaction_type === "entrada") entry.income += transaction.amount;
    else entry.expense += transaction.amount;
  }
  return months.map((month) => totals.get(month)!);
}

export interface CategorySpending {
  categoryId: string | null;
  amount: number;
  count: number;
}

/** Saídas concluídas do mês por categoria, da maior para a menor. */
export function spendingByCategory(transactions: Transaction[], yearMonth: string): CategorySpending[] {
  const map = new Map<string | null, CategorySpending>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "saida" || transaction.status !== "concluida" || !transaction.date.startsWith(yearMonth)) continue;
    const entry = map.get(transaction.category_id) ?? { categoryId: transaction.category_id, amount: 0, count: 0 };
    entry.amount += transaction.amount;
    entry.count += 1;
    map.set(transaction.category_id, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
  plannedIncome: number;
  plannedExpense: number;
}

/** Realizado e previsto de um mês, incluindo recorrências ainda não lançadas. */
export function summarizeMonth(transactions: Transaction[], recurring: RecurringTransaction[], yearMonth: string): MonthSummary {
  const [year = 0, month = 1] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const to = formatLocalDate(new Date(year, month, 0));
  let income = 0;
  let expense = 0;
  let plannedIncome = 0;
  let plannedExpense = 0;
  const represented = new Set<string>();
  for (const transaction of transactions) {
    if (!transaction.date.startsWith(yearMonth)) continue;
    if (transaction.recurring_transaction_id) represented.add(`${transaction.recurring_transaction_id}:${transaction.date}`);
    if (transaction.transaction_type === "transferencia" || transaction.status === "cancelada") continue;
    const isIncome = transaction.transaction_type === "entrada";
    if (transaction.status === "concluida") {
      if (isIncome) income += transaction.amount;
      else expense += transaction.amount;
    } else if (isIncome) plannedIncome += transaction.amount;
    else plannedExpense += transaction.amount;
  }
  for (const occurrence of projectRecurringOccurrences(recurring, from, to)) {
    if (represented.has(`${occurrence.recurringId}:${occurrence.date}`)) continue;
    if (occurrence.transaction_type === "entrada") plannedIncome += occurrence.amount;
    else plannedExpense += occurrence.amount;
  }
  return { income, expense, net: income - expense, plannedIncome, plannedExpense };
}

export interface UpcomingBill {
  key: string;
  name: string;
  amount: number;
  date: string;
  type: "entrada" | "saida";
  categoryId: string | null;
  /** Transação já lançada (pode ser marcada como paga) ou só prevista pela recorrência. */
  transaction: Transaction | null;
  recurringId: string | null;
  overdue: boolean;
}

/** Contas a pagar/receber no período: lançadas e não concluídas + recorrências previstas. */
export function upcomingBills(transactions: Transaction[], recurring: RecurringTransaction[], today: string, days = 14): UpcomingBill[] {
  const [y = 0, m = 1, d = 1] = today.split("-").map(Number);
  const until = formatLocalDate(new Date(y, m - 1, d + days));
  const represented = new Set(transactions.filter((t) => t.recurring_transaction_id).map((t) => `${t.recurring_transaction_id}:${t.date}`));
  const bills: UpcomingBill[] = [];
  for (const transaction of transactions) {
    if (transaction.transaction_type === "transferencia") continue;
    if (!["futura", "pendente", "vencida"].includes(transaction.status)) continue;
    if (transaction.date > until) continue;
    bills.push({
      key: transaction.id,
      name: transaction.name,
      amount: transaction.amount,
      date: transaction.date,
      type: transaction.transaction_type as "entrada" | "saida",
      categoryId: transaction.category_id,
      transaction,
      recurringId: transaction.recurring_transaction_id,
      overdue: transaction.date < today || transaction.status === "vencida",
    });
  }
  for (const occurrence of projectRecurringOccurrences(recurring, today, until)) {
    if (represented.has(`${occurrence.recurringId}:${occurrence.date}`)) continue;
    bills.push({
      key: `${occurrence.recurringId}:${occurrence.date}`,
      name: occurrence.name,
      amount: occurrence.amount,
      date: occurrence.date,
      type: occurrence.transaction_type === "entrada" ? "entrada" : "saida",
      categoryId: occurrence.category_id,
      transaction: null,
      recurringId: occurrence.recurringId,
      overdue: false,
    });
  }
  return bills.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}

/* ───────────────────── Importação de extrato (CSV) ───────────────────── */

export interface StatementRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positivo
  type: "entrada" | "saida";
  line: number;
}

export interface ParsedStatement {
  rows: StatementRow[];
  skipped: Array<{ line: number; reason: string }>;
  delimiter: string;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}

function parseDateCell(value: string): string | null {
  const text = value.trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(text);
  if (match) {
    const year = match[3]!.length === 2 ? `20${match[3]}` : match[3]!;
    const month = Number(match[2]);
    const day = Number(match[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

/** Aceita "1.234,56", "-1234.56", "R$ 1.234,56", "(123,45)" e "123,45 D/C". */
export function parseAmountCell(value: string): number | null {
  let text = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/[dD]$/.test(text)) {
    negative = true;
    text = text.slice(0, -1);
  } else if (/[cC]$/.test(text)) text = text.slice(0, -1);
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) text = text.slice(1);
  text = text.replace(/^R\$/i, "");
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) text = text.replace(/\./g, "").replace(",", ".");
  else text = text.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const amount = Number(text);
  return negative ? -amount : amount;
}

/**
 * Lê extratos CSV de bancos brasileiros: detecta separador (; , ou tab), cabeçalho (data,
 * descrição/histórico/lançamento, valor — ou colunas separadas de débito e crédito) e formatos
 * de data/valor comuns. Linhas que não parecem lançamentos (saldo, totais) são ignoradas.
 */
export function parseStatementCsv(text: string): ParsedStatement {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  const sample = lines.slice(0, 5).join("\n");
  const delimiter = [";", "\t", ","].map((candidate) => ({ candidate, count: sample.split(candidate).length })).sort((a, b) => b.count - a.count)[0]!.candidate;
  const rows: StatementRow[] = [];
  const skipped: ParsedStatement["skipped"] = [];

  let headerIndex = -1;
  let columns = { date: -1, description: -1, amount: -1, debit: -1, credit: -1 };
  for (let index = 0; index < Math.min(lines.length, 10); index += 1) {
    const cells = splitCsvLine(lines[index]!, delimiter).map(normalizeHeader);
    const date = cells.findIndex((cell) => cell.startsWith("data") || cell === "date" || cell === "dt");
    const description = cells.findIndex((cell) => /^(descricao|historico|lancamento|description|memo|detalhe|estabelecimento|titulo)/.test(cell));
    const amount = cells.findIndex((cell) => /^(valor|amount|quantia|montante)/.test(cell));
    const debit = cells.findIndex((cell) => /^(debito|saida|debit)/.test(cell));
    const credit = cells.findIndex((cell) => /^(credito|entrada|credit)/.test(cell));
    if (date >= 0 && (amount >= 0 || debit >= 0 || credit >= 0)) {
      headerIndex = index;
      columns = { date, description, amount, debit, credit };
      break;
    }
  }
  if (headerIndex === -1) {
    // Sem cabeçalho: assume data; descrição; valor.
    columns = { date: 0, description: 1, amount: 2, debit: -1, credit: -1 };
  }

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index]!, delimiter);
    const date = parseDateCell(cells[columns.date] ?? "");
    const description = (columns.description >= 0 ? cells[columns.description] : cells.find((cell, cellIndex) => cellIndex !== columns.date && !parseAmountCell(cell))) ?? "";
    if (!date) {
      skipped.push({ line: index + 1, reason: "data não reconhecida" });
      continue;
    }
    if (/^(saldo|total|s\.?\s*d\.?\s*anterior)/i.test(description.trim())) {
      skipped.push({ line: index + 1, reason: "linha de saldo/total" });
      continue;
    }
    let amount: number | null = null;
    if (columns.amount >= 0) amount = parseAmountCell(cells[columns.amount] ?? "");
    else {
      const debit = parseAmountCell(cells[columns.debit] ?? "");
      const credit = parseAmountCell(cells[columns.credit] ?? "");
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount === null || amount === 0) {
      skipped.push({ line: index + 1, reason: "valor não reconhecido" });
      continue;
    }
    rows.push({ date, description: description.replace(/\s+/g, " ").trim() || "Lançamento importado", amount: Math.abs(amount), type: amount < 0 ? "saida" : "entrada", line: index + 1 });
  }
  return { rows, skipped, delimiter };
}

function importKey(date: string, amount: number, description: string): string {
  return `${date}|${amount.toFixed(2)}|${description.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/** Marca como duplicadas as linhas que já existem (mesma data, valor e descrição). */
export function findDuplicateImports(rows: StatementRow[], existing: Transaction[]): Set<number> {
  const keys = new Set(existing.map((transaction) => importKey(transaction.date, transaction.amount, transaction.name)));
  const duplicates = new Set<number>();
  for (const row of rows) if (keys.has(importKey(row.date, row.amount, row.description))) duplicates.add(row.line);
  return duplicates;
}

function significantTokens(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !/^\d+$/.test(token) && !["pagamento", "compra", "pix", "transferencia", "debito", "credito"].includes(token));
}

/** Sugere categoria pelo histórico: mesma descrição, ou mesma palavra principal ("NETFLIX.COM" ≈ "Netflix"). */
export function suggestCategory(description: string, history: Transaction[]): string | null {
  const tokens = significantTokens(description);
  const exact = description.trim().toLowerCase();
  let best: string | null = null;
  for (const transaction of history) {
    if (!transaction.category_id) continue;
    if (transaction.name.trim().toLowerCase() === exact) return transaction.category_id;
    if (best) continue;
    const nameTokens = significantTokens(transaction.name);
    if (tokens[0] && (nameTokens.includes(tokens[0]) || (nameTokens[0] && tokens.includes(nameTokens[0])))) best = transaction.category_id;
  }
  return best;
}
