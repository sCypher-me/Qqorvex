import type { SupabaseClient, Database } from "@qqorvex/database";
import { listEventsInRange } from "@qqorvex/module-agenda";
import { listRecurringTransactions, listTransactions, upcomingBills } from "@qqorvex/module-financas";
import { habitScheduleOn, listHabitLogsForDate, listHabits } from "@qqorvex/module-metas-habitos";
import { compareTasksForAction, listActiveTasks } from "@qqorvex/module-tarefas";
import type { ToolDefinition } from "../types";
import { describeEvent } from "./agendaTools";
import { addDays, formatDateKey, formatMoney, isDateKey, localDateKey, localDateTime } from "./shared";
import { describeTask } from "./tarefasTools";

async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

/**
 * Visão consolidada de um dia em UMA consulta: compromissos, tarefas (atrasadas + do dia),
 * hábitos e contas próximas. É a base de "organize meu dia" sem gastar várias rodadas do modelo.
 * Uma área que falhar não derruba as outras — a seção só diz que não foi possível carregar.
 */
export function createHojeTools(client: SupabaseClient<Database>): ToolDefinition[] {
  return [
    {
      name: "get_day_overview",
      label: "Seu dia",
      description:
        "Visão geral de um dia (padrão: hoje): compromissos com horário, tarefas atrasadas e com prazo no dia, hábitos previstos e contas a vencer nos próximos 3 dias. Use antes de planejar ou resumir o dia.",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "Data AAAA-MM-DD (padrão: hoje)" } },
      },
      requiresConfirmation: false,
      async execute(args) {
        const today = localDateKey();
        const date = isDateKey(args.date) ? args.date : today;
        const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
        const start = localDateTime(date, "00:00");
        const end = localDateTime(addDays(date, 1), "00:00");

        const [events, tasks, habits, logs, transactions, recurring] = await Promise.all([
          settle(listEventsInRange(client, start.toISOString(), end.toISOString())),
          settle(listActiveTasks(client)),
          settle(listHabits(client)),
          settle(listHabitLogsForDate(client, date)),
          settle(listTransactions(client, addDays(today, -60))),
          settle(listRecurringTransactions(client)),
        ]);

        const sections: string[] = [`Visão de ${formatDateKey(date, today)} (${date}):`];

        if (!events) sections.push("Compromissos: não foi possível carregar.");
        else if (events.length === 0) sections.push("Compromissos: nenhum.");
        else sections.push(`Compromissos (${events.length}):\n${events.map((event) => describeEvent(event, today)).join("\n")}`);

        if (!tasks) sections.push("Tarefas: não foi possível carregar.");
        else {
          const open = tasks.filter((task) => task.status !== "concluido").sort(compareTasksForAction);
          const overdue = open.filter((task) => task.due_date !== null && task.due_date < date);
          const dueThatDay = open.filter((task) => task.due_date === date);
          const noDate = open.filter((task) => task.due_date === null);
          if (overdue.length) sections.push(`Tarefas atrasadas (${overdue.length}):\n${overdue.slice(0, 15).map((task) => describeTask(task, today)).join("\n")}`);
          sections.push(dueThatDay.length ? `Tarefas com prazo no dia (${dueThatDay.length}):\n${dueThatDay.map((task) => describeTask(task, today)).join("\n")}` : "Tarefas com prazo no dia: nenhuma.");
          if (noDate.length) sections.push(`Tarefas sem prazo: ${noDate.length} (ex.: ${noDate.slice(0, 5).map((task) => `"${task.title}"`).join(", ")}).`);
        }

        if (!habits) sections.push("Hábitos: não foi possível carregar.");
        else {
          const stateById = new Map((logs ?? []).map((log) => [log.habit_id, log.state]));
          const due = habits.filter((habit) => habitScheduleOn(habit, new Date(y, m - 1, d)) !== null);
          if (due.length) {
            sections.push(`Hábitos previstos (${due.length}):\n${due.map((habit) => `- ${habit.name}: ${stateById.get(habit.id) === "concluido" ? "feito" : "pendente"}`).join("\n")}`);
          }
        }

        if (transactions && recurring) {
          const bills = upcomingBills(transactions, recurring, date, 3).filter((bill) => bill.type === "saida");
          if (bills.length) sections.push(`Contas a pagar até ${formatDateKey(addDays(date, 3), today)}:\n${bills.map((bill) => `- ${formatDateKey(bill.date, today)} · ${formatMoney(bill.amount)} · ${bill.name}${bill.date < today ? " · VENCIDA" : ""}`).join("\n")}`);
        }

        return { summary: sections.join("\n\n") };
      },
    },
  ];
}
