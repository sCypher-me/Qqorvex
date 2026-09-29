import { describe, expect, it } from "vitest";
import { findDuplicateImports, monthlyTotals, parseAmountCell, parseStatementCsv, spendingByCategory, suggestCategory, summarizeMonth, upcomingBills } from "./insights";
import type { RecurringTransaction, Transaction } from "./types";

function tx(overrides: Partial<Transaction>): Transaction {
  return { id: "t", name: "x", amount: 10, transaction_type: "saida", status: "concluida", date: "2026-09-10", category_id: null, recurring_transaction_id: null, ...overrides } as Transaction;
}

describe("totais e composição", () => {
  const transactions = [
    tx({ id: "1", transaction_type: "entrada", amount: 5000, date: "2026-09-05" }),
    tx({ id: "2", amount: 300, date: "2026-09-06", category_id: "mercado" }),
    tx({ id: "3", amount: 200, date: "2026-09-07", category_id: "mercado" }),
    tx({ id: "4", amount: 150, date: "2026-08-07", category_id: "lazer" }),
    tx({ id: "5", amount: 999, date: "2026-09-08", transaction_type: "transferencia" }),
    tx({ id: "6", amount: 80, date: "2026-09-20", status: "futura", category_id: "lazer" }),
  ];

  it("soma receitas e despesas por mês", () => {
    const result = monthlyTotals(transactions, "2026-09", 2);
    expect(result).toEqual([
      { month: "2026-08", income: 0, expense: 150 },
      { month: "2026-09", income: 5000, expense: 500 },
    ]);
  });

  it("agrupa gastos concluídos por categoria", () => {
    expect(spendingByCategory(transactions, "2026-09")).toEqual([{ categoryId: "mercado", amount: 500, count: 2 }]);
  });

  it("resume realizado e previsto do mês, incluindo recorrência não lançada", () => {
    const recurring = [{ id: "r", status: "ativa", next_occurrence_date: "2026-09-25", start_date: "2026-01-25", end_date: null, frequency: "mensal", name: "Internet", amount: 120, transaction_type: "saida", category_id: null } as unknown as RecurringTransaction];
    expect(summarizeMonth(transactions, recurring, "2026-09")).toEqual({ income: 5000, expense: 500, net: 4500, plannedIncome: 0, plannedExpense: 200 });
  });

  it("lista contas próximas e vencidas", () => {
    const bills = upcomingBills([tx({ id: "a", status: "vencida", date: "2026-09-01" }), tx({ id: "b", status: "futura", date: "2026-10-30" })], [], "2026-09-29", 14);
    expect(bills.map((bill) => [bill.key, bill.overdue])).toEqual([["a", true]]);
  });
});

describe("importação de extrato", () => {
  it("lê valores em formatos brasileiros", () => {
    expect(parseAmountCell("1.234,56")).toBe(1234.56);
    expect(parseAmountCell("-R$ 89,90")).toBe(-89.9);
    expect(parseAmountCell("(45,00)")).toBe(-45);
    expect(parseAmountCell("120,00 D")).toBe(-120);
    expect(parseAmountCell("1234.5")).toBe(1234.5);
    expect(parseAmountCell("abc")).toBeNull();
  });

  it("detecta cabeçalho, separador e ignora linhas de saldo", () => {
    const csv = "Data;Histórico;Valor\n01/09/2026;PIX RECEBIDO JOAO;1.500,00\n02/09/2026;SUPERMERCADO BOM PRECO;-230,45\n02/09/2026;SALDO DO DIA;1.269,55\n";
    const parsed = parseStatementCsv(csv);
    expect(parsed.delimiter).toBe(";");
    expect(parsed.rows).toEqual([
      { date: "2026-09-01", description: "PIX RECEBIDO JOAO", amount: 1500, type: "entrada", line: 2 },
      { date: "2026-09-02", description: "SUPERMERCADO BOM PRECO", amount: 230.45, type: "saida", line: 3 },
    ]);
    expect(parsed.skipped).toHaveLength(1);
  });

  it("entende colunas separadas de débito e crédito", () => {
    const csv = 'date,description,debit,credit\n2026-09-03,"Uber, viagem",25.90,\n2026-09-04,Salário,,8500.00';
    const parsed = parseStatementCsv(csv);
    expect(parsed.rows.map((row) => [row.description, row.type, row.amount])).toEqual([
      ["Uber, viagem", "saida", 25.9],
      ["Salário", "entrada", 8500],
    ]);
  });

  it("marca duplicadas e sugere categoria pelo histórico", () => {
    const rows = parseStatementCsv("Data;Descrição;Valor\n05/09/2026;Netflix;-44,90").rows;
    const history = [tx({ name: "Netflix", amount: 44.9, date: "2026-09-05", category_id: "assinaturas" })];
    expect(findDuplicateImports(rows, history).has(2)).toBe(true);
    expect(suggestCategory("NETFLIX.COM", history)).toBe("assinaturas");
  });
});
