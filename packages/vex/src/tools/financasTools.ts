import type { SupabaseClient, Database } from "@qqorvex/database";
import { createTransaction, createRecurringTransaction, listTransactions, computeBalances, type RecurrenceFrequency } from "@qqorvex/module-financas";
import type { ToolDefinition } from "../types";

/**
 * Ferramentas da Vex para Finanças. "Toda operação passa pelas APIs/repositories do módulo
 * Finanças; a Vex nunca acessa o banco diretamente." Consulta executa direto; criar movimentação
 * exige confirmação (mudança persistente e sensível).
 */
export function createFinancasTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_financial_summary",
      description: "Resume saldo atual e saldo projetado",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const transactions = await listTransactions(client);
        const balances = computeBalances(transactions);
        return {
          summary: `Saldo atual: R$ ${balances.saldoAtual.toFixed(2)}. Saldo projetado: R$ ${balances.saldoProjetado.toFixed(2)}.`,
          data: balances,
        };
      },
    },
    {
      name: "create_transaction",
      description:
        "Cria uma movimentação avulsa (não recorrente) de entrada ou saída para hoje. Pergunte o motivo do gasto/receita, se é entrada ou saída, e se é recorrente ANTES de chamar esta ferramenta — os três são obrigatórios. Se for recorrente, use create_recurring_transaction em vez desta.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Motivo/descrição da movimentação" },
          amount: { type: "number" },
          transactionType: { type: "string", enum: ["entrada", "saida"] },
          isRecurring: {
            type: "boolean",
            description: "true se o usuário disse que essa movimentação se repete (assinatura, salário mensal, etc.)",
          },
        },
        required: ["name", "amount", "transactionType", "isRecurring"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const name = String(args.name ?? "").trim();
        const amount = Number(args.amount);
        const transactionType = args.transactionType === "entrada" ? "entrada" : "saida";
        if (!name || !(amount > 0)) return { summary: "Não consegui criar a movimentação: dados inválidos." };
        if (args.isRecurring === true) {
          return {
            summary:
              "Essa movimentação é recorrente — use a ferramenta create_recurring_transaction em vez desta (precisa também da frequência: mensal/bimestral/trimestral/semestral/anual).",
          };
        }
        const transaction = await createTransaction(client, userId, {
          name,
          amount,
          transactionType,
          date: new Date().toISOString().slice(0, 10),
        });
        return { summary: `Movimentação criada: "${transaction.name}" (R$ ${transaction.amount.toFixed(2)}).`, data: transaction };
      },
    },
    {
      name: "create_recurring_transaction",
      description: "Cria uma movimentação recorrente de entrada ou saída (assinatura, salário mensal, etc.), a partir de hoje",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Motivo/descrição da movimentação" },
          amount: { type: "number" },
          transactionType: { type: "string", enum: ["entrada", "saida"] },
          frequency: {
            type: "string",
            enum: ["mensal", "bimestral", "trimestral", "semestral", "anual"],
          },
        },
        required: ["name", "amount", "transactionType", "frequency"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const name = String(args.name ?? "").trim();
        const amount = Number(args.amount);
        const transactionType = args.transactionType === "entrada" ? "entrada" : "saida";
        if (!name || !(amount > 0)) return { summary: "Não consegui criar a recorrência: dados inválidos." };
        const recurring = await createRecurringTransaction(client, userId, {
          name,
          amount,
          transactionType,
          frequency: args.frequency as RecurrenceFrequency,
          startDate: new Date().toISOString().slice(0, 10),
        });
        return { summary: `Movimentação recorrente criada: "${recurring.name}" (${recurring.frequency}).`, data: recurring };
      },
    },
  ];
}
