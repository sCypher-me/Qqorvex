import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  computeBalances,
  createRecurringTransaction,
  createTransaction,
  listCategories,
  listRecurringTransactions,
  listTransactions,
  spendingByCategory,
  summarizeMonth,
  updateTransaction,
  upcomingBills,
  type RecurrenceFrequency,
} from "@qqorvex/module-financas";
import type { ToolDefinition } from "../types";
import { addDays, ambiguousSummary, formatDateKey, formatMoney, isDateKey, localDateKey, matchByName } from "./shared";

function isYearMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthLabel(yearMonth: string): string {
  const [y = 0, m = 1] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/**
 * Ferramentas da Vex para Finanças. Toda operação passa pelas APIs do módulo; a Vex nunca
 * acessa o banco diretamente. Consultas executam direto; lançamentos exigem confirmação.
 */
export function createFinancasTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_financial_summary",
      label: "Finanças",
      description: "Resume o saldo atual, o saldo projetado e as entradas/saídas do mês corrente",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const today = localDateKey();
        const month = today.slice(0, 7);
        const [transactions, recurring] = await Promise.all([listTransactions(client), listRecurringTransactions(client)]);
        const balances = computeBalances(transactions);
        const summary = summarizeMonth(transactions, recurring, month);
        return {
          summary:
            `Saldo atual: ${formatMoney(balances.saldoAtual)}. Saldo projetado: ${formatMoney(balances.saldoProjetado)}.\n` +
            `Em ${monthLabel(month)}: entradas ${formatMoney(summary.income)}, saídas ${formatMoney(summary.expense)}, resultado ${formatMoney(summary.net)}. ` +
            `Ainda previsto no mês: +${formatMoney(summary.plannedIncome)} / −${formatMoney(summary.plannedExpense)}.`,
          data: { balances, summary },
        };
      },
    },
    {
      name: "get_month_spending",
      label: "Finanças",
      description: "Mostra quanto foi gasto em um mês por categoria (padrão: mês atual), com o total e a comparação com o mês anterior",
      parameters: {
        type: "object",
        properties: { month: { type: "string", description: "Mês AAAA-MM (opcional)" } },
      },
      requiresConfirmation: false,
      async execute(args) {
        const month = isYearMonth(args.month) ? args.month : localDateKey().slice(0, 7);
        const [y = 0, m = 1] = month.split("-").map(Number);
        const previous = localDateKey(new Date(y, m - 2, 1)).slice(0, 7);
        const [transactions, categories] = await Promise.all([listTransactions(client, `${previous}-01`), listCategories(client)]);
        const nameOf = new Map(categories.map((category) => [category.id, category.name]));
        const rows = spendingByCategory(transactions, month);
        const total = rows.reduce((sum, row) => sum + row.amount, 0);
        const previousTotal = spendingByCategory(transactions, previous).reduce((sum, row) => sum + row.amount, 0);
        if (rows.length === 0) return { summary: `Nenhuma despesa concluída em ${monthLabel(month)}.` };
        const lines = rows.slice(0, 12).map((row) => `- ${row.categoryId ? nameOf.get(row.categoryId) ?? "Categoria" : "Sem categoria"}: ${formatMoney(row.amount)} (${Math.round((row.amount / total) * 100)}%, ${row.count} lançamento(s))`);
        const delta = previousTotal > 0 ? ` (${total >= previousTotal ? "+" : "−"}${Math.abs(Math.round(((total - previousTotal) / previousTotal) * 100))}% vs. ${monthLabel(previous)})` : "";
        return { summary: `Despesas de ${monthLabel(month)}: ${formatMoney(total)}${delta}.\n${lines.join("\n")}`, data: rows };
      },
    },
    {
      name: "list_upcoming_bills",
      label: "Finanças",
      description: "Lista contas a pagar e receber nos próximos dias (inclui vencidas não pagas e recorrências previstas)",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "Quantos dias à frente (padrão 14, máx. 60)" } },
      },
      requiresConfirmation: false,
      async execute(args) {
        const today = localDateKey();
        const days = Math.min(Math.max(Math.round(Number(args.days) || 14), 1), 60);
        const [transactions, recurring] = await Promise.all([listTransactions(client, addDays(today, -60)), listRecurringTransactions(client)]);
        const bills = upcomingBills(transactions, recurring, today, days);
        if (bills.length === 0) return { summary: `Nada a pagar ou receber nos próximos ${days} dias.` };
        const lines = bills.slice(0, 30).map((bill) => `- ${formatDateKey(bill.date, today)} (${bill.date}) · ${bill.type === "entrada" ? "receber" : "pagar"} ${formatMoney(bill.amount)} · ${bill.name}${bill.date < today ? " · VENCIDA" : ""}`);
        const toPay = bills.filter((bill) => bill.type === "saida").reduce((sum, bill) => sum + bill.amount, 0);
        return { summary: `Próximos ${days} dias — total a pagar ${formatMoney(toPay)}:\n${lines.join("\n")}`, data: bills };
      },
    },
    {
      name: "update_transaction_by_name",
      label: "Finanças",
      description:
        "Corrige um lançamento existente (dos últimos 120 dias até os próximos 60), achado pelo nome: novo nome, novo valor e/ou nova data. Só informe o que a pessoa quer corrigir — categoria, conta, cartão e situação continuam iguais.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome atual (ou parte dele) do lançamento" },
          newName: { type: "string", description: "Novo nome (opcional)" },
          amount: { type: "number", description: "Novo valor em reais, sempre positivo (opcional)" },
          date: { type: "string", description: "Nova data AAAA-MM-DD (opcional)" },
        },
        required: ["name"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Corrigir lançamento",
        fields: [
          { label: "Lançamento", value: String(args.name ?? "") },
          ...(args.newName ? [{ label: "Novo nome", value: String(args.newName) }] : []),
          ...(typeof args.amount === "number" ? [{ label: "Novo valor", value: formatMoney(args.amount) }] : []),
          ...(isDateKey(args.date) ? [{ label: "Nova data", value: formatDateKey(args.date) }] : []),
        ],
      }),
      async execute(args) {
        const newName = String(args.newName ?? "").trim();
        const amount = typeof args.amount === "number" ? args.amount : undefined;
        if (amount !== undefined && !(amount > 0)) return { summary: "Não corrigi: o valor precisa ser maior que zero." };
        if (args.date !== undefined && !isDateKey(args.date)) return { summary: "Não corrigi: a data precisa estar no formato AAAA-MM-DD." };
        if (!newName && amount === undefined && !isDateKey(args.date)) return { summary: "Não corrigi: diga o que mudar (nome, valor ou data)." };

        const today = localDateKey();
        const transactions = await listTransactions(client, addDays(today, -120), addDays(today, 60));
        const match = matchByName(transactions, String(args.name ?? ""), (transaction) => transaction.name);
        if (match.kind === "none") return { summary: `Não encontrei nenhum lançamento parecido com "${args.name}".` };
        if (match.kind === "many") {
          return { summary: ambiguousSummary("um lançamento", match.items, (t) => `${t.name} (${formatMoney(t.amount)}, ${formatDateKey(t.date, today)})`) };
        }

        const current = match.item;
        const updated = await updateTransaction(client, current.id, {
          name: newName || current.name,
          amount: amount ?? current.amount,
          date: isDateKey(args.date) ? args.date : current.date,
          // updateTransaction grava categoria ausente como "sem categoria": repassa a atual.
          categoryId: current.category_id ?? undefined,
          status: current.status,
        });
        return { summary: `Lançamento corrigido: "${updated.name}", ${formatMoney(updated.amount)} em ${formatDateKey(updated.date, today)}.`, data: updated };
      },
    },
    {
      name: "create_transaction",
      label: "Finanças",
      description:
        "Registra um lançamento avulso (não recorrente) de entrada ou saída. Pergunte o motivo, o valor e se é entrada ou saída antes de chamar. Se a pessoa disser que se repete, use create_recurring_transaction. category é o nome de uma categoria existente (opcional); date é AAAA-MM-DD (padrão hoje).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Motivo/descrição" },
          amount: { type: "number", description: "Valor positivo em reais" },
          transactionType: { type: "string", enum: ["entrada", "saida"] },
          isRecurring: { type: "boolean", description: "true se a movimentação se repete (assinatura, salário etc.)" },
          date: { type: "string", description: "Data AAAA-MM-DD (opcional, padrão hoje)" },
          category: { type: "string", description: "Nome da categoria (opcional)" },
        },
        required: ["name", "amount", "transactionType", "isRecurring"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: args.transactionType === "entrada" ? "Registrar receita" : "Registrar despesa",
        fields: [
          { label: "Descrição", value: String(args.name ?? "") },
          { label: "Valor", value: formatMoney(Number(args.amount) || 0) },
          { label: "Data", value: isDateKey(args.date) ? formatDateKey(args.date) : "hoje" },
          ...(args.category ? [{ label: "Categoria", value: String(args.category) }] : []),
        ],
      }),
      async execute(args) {
        const name = String(args.name ?? "").trim();
        const amount = Math.round(Number(args.amount) * 100) / 100;
        const transactionType = args.transactionType === "entrada" ? "entrada" : "saida";
        if (!name || !(amount > 0)) return { summary: "Não consegui registrar: descrição ou valor inválido." };
        if (args.isRecurring === true) {
          return { summary: "Essa movimentação é recorrente — use create_recurring_transaction (precisa da frequência: mensal, bimestral, trimestral, semestral ou anual)." };
        }
        let categoryId: string | undefined;
        let categoryNote = "";
        if (typeof args.category === "string" && args.category.trim()) {
          const categories = (await listCategories(client)).filter((category) => category.kind === transactionType);
          const match = matchByName(categories, args.category, (category) => category.name);
          if (match.kind === "one") categoryId = match.item.id;
          else categoryNote = ` A categoria "${args.category}" não foi encontrada; ficou sem categoria.`;
        }
        const date = isDateKey(args.date) ? args.date : localDateKey();
        const transaction = await createTransaction(client, userId, { name, amount, transactionType, date, categoryId });
        return { summary: `${transactionType === "entrada" ? "Receita" : "Despesa"} registrada: "${transaction.name}" (${formatMoney(transaction.amount)}) em ${formatDateKey(date)}.${categoryNote}`, data: transaction };
      },
    },
    {
      name: "create_recurring_transaction",
      label: "Finanças",
      description: "Cria uma movimentação recorrente de entrada ou saída (assinatura, salário mensal etc.), a partir de hoje",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Motivo/descrição" },
          amount: { type: "number" },
          transactionType: { type: "string", enum: ["entrada", "saida"] },
          frequency: { type: "string", enum: ["mensal", "bimestral", "trimestral", "semestral", "anual"] },
        },
        required: ["name", "amount", "transactionType", "frequency"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: args.transactionType === "entrada" ? "Criar receita recorrente" : "Criar despesa recorrente",
        fields: [
          { label: "Descrição", value: String(args.name ?? "") },
          { label: "Valor", value: formatMoney(Number(args.amount) || 0) },
          { label: "Frequência", value: String(args.frequency ?? "") },
        ],
      }),
      async execute(args) {
        const name = String(args.name ?? "").trim();
        const amount = Math.round(Number(args.amount) * 100) / 100;
        const transactionType = args.transactionType === "entrada" ? "entrada" : "saida";
        if (!name || !(amount > 0)) return { summary: "Não consegui criar a recorrência: dados inválidos." };
        const recurring = await createRecurringTransaction(client, userId, {
          name,
          amount,
          transactionType,
          frequency: args.frequency as RecurrenceFrequency,
          startDate: localDateKey(),
        });
        return { summary: `Recorrência criada: "${recurring.name}" (${formatMoney(recurring.amount)}, ${recurring.frequency}).`, data: recurring };
      },
    },
  ];
}
