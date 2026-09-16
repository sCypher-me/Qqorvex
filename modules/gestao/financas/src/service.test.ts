import { describe, expect, it } from "vitest";
import {
  computeAccountBalance,
  computeBalances,
  computeCurrentClosingDate,
  computeInstallmentAmounts,
  computeNextOccurrenceDate,
  computeStatementDueDate,
  computeStatementPeriod,
  computeStatementTotal,
  computeVehicleSpending,
  deriveInitialStatus,
  toReferenceMonth,
} from "./service";
import type { Transaction } from "./types";

function tx(overrides: Partial<Transaction>): Transaction {
  return { amount: 0, transaction_type: "saida", status: "concluida", ...overrides } as Transaction;
}

describe("deriveInitialStatus", () => {
  it("marca como futura quando a data é depois de hoje", () => {
    expect(deriveInitialStatus("2026-09-20", new Date("2026-09-15"))).toBe("futura");
  });

  it("marca como concluida quando a data é hoje ou antes", () => {
    expect(deriveInitialStatus("2026-09-15", new Date("2026-09-15"))).toBe("concluida");
    expect(deriveInitialStatus("2026-09-01", new Date("2026-09-15"))).toBe("concluida");
  });
});

describe("computeBalances", () => {
  it("soma só concluídas no saldo atual e ignora transferências e canceladas", () => {
    const balances = computeBalances([
      tx({ transaction_type: "entrada", status: "concluida", amount: 100 }),
      tx({ transaction_type: "saida", status: "concluida", amount: 40 }),
      tx({ transaction_type: "transferencia", status: "concluida", amount: 500 }),
      tx({ transaction_type: "saida", status: "cancelada", amount: 999 }),
    ]);
    expect(balances.saldoAtual).toBe(60);
    expect(balances.entradasRealizadas).toBe(100);
    expect(balances.saidasRealizadas).toBe(40);
  });

  it("soma futuras/pendentes/vencidas no saldo projetado sem afetar o saldo atual", () => {
    const balances = computeBalances([
      tx({ transaction_type: "entrada", status: "concluida", amount: 100 }),
      tx({ transaction_type: "entrada", status: "futura", amount: 50 }),
      tx({ transaction_type: "saida", status: "pendente", amount: 20 }),
      tx({ transaction_type: "saida", status: "vencida", amount: 10 }),
    ]);
    expect(balances.saldoAtual).toBe(100);
    expect(balances.entradasFuturas).toBe(50);
    expect(balances.saidasFuturas).toBe(30);
    expect(balances.saldoProjetado).toBe(100 + 50 - 30);
  });
});

describe("computeAccountBalance", () => {
  it("transferência sai da conta de origem e entra na conta de destino", () => {
    const transactions = [
      tx({ transaction_type: "transferencia", status: "concluida", amount: 100, account_id: "a", transfer_to_account_id: "b" } as Partial<Transaction>),
    ];
    expect(computeAccountBalance(transactions, "a")).toBe(-100);
    expect(computeAccountBalance(transactions, "b")).toBe(100);
  });

  it("ignora transações não concluídas e de outras contas", () => {
    const transactions = [
      tx({ transaction_type: "entrada", status: "futura", amount: 100, account_id: "a" } as Partial<Transaction>),
      tx({ transaction_type: "entrada", status: "concluida", amount: 100, account_id: "outra" } as Partial<Transaction>),
    ];
    expect(computeAccountBalance(transactions, "a")).toBe(0);
  });
});

describe("computeVehicleSpending", () => {
  it("soma só saídas concluídas do veículo pedido", () => {
    const transactions = [
      tx({ transaction_type: "saida", status: "concluida", amount: 200, vehicle_id: "v1" } as Partial<Transaction>),
      tx({ transaction_type: "saida", status: "futura", amount: 999, vehicle_id: "v1" } as Partial<Transaction>),
      tx({ transaction_type: "entrada", status: "concluida", amount: 999, vehicle_id: "v1" } as Partial<Transaction>),
      tx({ transaction_type: "saida", status: "concluida", amount: 999, vehicle_id: "outro" } as Partial<Transaction>),
    ];
    expect(computeVehicleSpending(transactions, "v1")).toBe(200);
  });
});

describe("computeNextOccurrenceDate", () => {
  it("avança pela frequência, inclusive virada de ano (anual)", () => {
    expect(computeNextOccurrenceDate("2026-10-09", "anual")).toBe("2027-10-09");
    expect(computeNextOccurrenceDate("2026-09-15", "mensal")).toBe("2026-10-15");
    expect(computeNextOccurrenceDate("2026-09-15", "bimestral")).toBe("2026-11-15");
    expect(computeNextOccurrenceDate("2026-09-15", "trimestral")).toBe("2026-12-15");
    expect(computeNextOccurrenceDate("2026-09-15", "semestral")).toBe("2027-03-15");
  });
});

describe("computeInstallmentAmounts", () => {
  it("divide em parcelas iguais quando divide certo", () => {
    expect(computeInstallmentAmounts(300, 3)).toEqual([100, 100, 100]);
  });

  it("a última parcela absorve o resto de centavos, batendo com o total", () => {
    const amounts = computeInstallmentAmounts(100, 3);
    expect(amounts).toEqual([33.33, 33.33, 33.34]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });
});

describe("computeCurrentClosingDate", () => {
  it("usa o fechamento deste mês quando ainda não passou", () => {
    const closing = computeCurrentClosingDate(20, new Date(2026, 8, 15));
    expect(closing.getMonth()).toBe(8);
    expect(closing.getDate()).toBe(20);
  });

  it("avança pro fechamento do próximo mês quando já passou", () => {
    const closing = computeCurrentClosingDate(10, new Date(2026, 8, 15));
    expect(closing.getMonth()).toBe(9);
    expect(closing.getDate()).toBe(10);
  });

  it("considera o próprio dia de fechamento como 'ainda não passou'", () => {
    const closing = computeCurrentClosingDate(15, new Date(2026, 8, 15));
    expect(closing.getMonth()).toBe(8);
    expect(closing.getDate()).toBe(15);
  });
});

describe("computeStatementPeriod", () => {
  it("período vai do dia seguinte ao fechamento anterior até o fechamento atual", () => {
    const { periodStart, periodEnd } = computeStatementPeriod(10, new Date(2026, 8, 15));
    expect(periodEnd.getMonth()).toBe(9);
    expect(periodEnd.getDate()).toBe(10);
    expect(periodStart.getMonth()).toBe(8);
    expect(periodStart.getDate()).toBe(11);
  });
});

describe("computeStatementDueDate", () => {
  it("vencimento é a próxima ocorrência do dia estritamente após o fechamento", () => {
    const closingDate = new Date(2026, 8, 10);
    const due = computeStatementDueDate(closingDate, 17);
    expect(due.getMonth()).toBe(8);
    expect(due.getDate()).toBe(17);
  });

  it("avança pro mês seguinte quando o dia de vencimento é igual ou antes do fechamento", () => {
    const closingDate = new Date(2026, 8, 20);
    const due = computeStatementDueDate(closingDate, 10);
    expect(due.getMonth()).toBe(9);
    expect(due.getDate()).toBe(10);
  });
});

describe("toReferenceMonth", () => {
  it("formata como YYYY-MM com mês em 2 dígitos", () => {
    expect(toReferenceMonth(new Date(2026, 0, 5))).toBe("2026-01");
    expect(toReferenceMonth(new Date(2026, 10, 5))).toBe("2026-11");
  });
});

describe("computeStatementTotal", () => {
  it("soma o amount de todas as transações passadas", () => {
    expect(computeStatementTotal([tx({ amount: 10 }), tx({ amount: 20.5 })])).toBe(30.5);
  });

  it("retorna 0 pra lista vazia", () => {
    expect(computeStatementTotal([])).toBe(0);
  });
});
