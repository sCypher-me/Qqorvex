import type { SupabaseClient, Database } from "@qqorvex/database";
import { listEventsInRange } from "@qqorvex/module-agenda";
import { listRecurringTransactions, listTransactions, upcomingBills } from "@qqorvex/module-financas";
import { habitScheduleOn, listHabitLogsForDate, listHabits } from "@qqorvex/module-metas-habitos";
import { buildDayPlan, defaultTaskMinutes, formatPlanMinutes, normalizeDayWindow, type DayPlan, type DayWindow } from "@qqorvex/module-hoje";
import { compareTasksForAction, listActiveTasks, selectDayPlanTasks, type Task } from "@qqorvex/module-tarefas";
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

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function readDayWindow(client: SupabaseClient<Database>): Promise<DayWindow> {
  try {
    const { data } = await client.auth.getUser();
    const saved = data.user?.user_metadata?.qqorvex_preferences;
    return normalizeDayWindow(saved && typeof saved === "object" ? (saved as Record<string, unknown>).day_window : undefined);
  } catch {
    return normalizeDayWindow(undefined);
  }
}

type PlanEvent = { id: string; title: string; start_at: string; end_at: string; is_all_day: boolean };

/** Mesmo plano que a tela Hoje mostra: mesmas tarefas, ordem, janela e folga. */
export function planForDate(tasks: Task[], events: PlanEvent[], date: string, today: string, window: DayWindow, now = new Date()): DayPlan {
  const candidates = selectDayPlanTasks(tasks, date);
  return buildDayPlan({
    now: date === today ? now : localDateTime(date, window.start),
    window,
    defaultMinutes: defaultTaskMinutes(tasks.map((task) => task.estimated_minutes ?? 0)),
    tasks: candidates.map((task) => ({ id: task.id, title: task.title, estimatedMinutes: task.estimated_minutes, mustFinishToday: task.due_date !== null && task.due_date <= date })),
    events: events.filter((event) => !event.is_all_day).map((event) => ({ id: event.id, title: event.title, start: new Date(event.start_at), end: new Date(event.end_at) })),
  });
}

export function describeDayPlan(plan: DayPlan, window: DayWindow): string {
  const header = `Plano sugerido (disponível ${window.start}–${window.end}, com 20% reservado para pausas e imprevistos; é o mesmo plano que a pessoa vê em Hoje):`;
  if (plan.status === "encerrado") {
    const open = plan.overflow.length ? ` Ficaram abertas: ${plan.overflow.map((task) => `"${task.title}"`).join(", ")}.` : "";
    return `${header}\n- O horário disponível do dia terminou às ${window.end}.${open}`;
  }
  const lines = plan.entries.flatMap((entry) => {
    if (entry.kind === "pause") return [];
    const range = `${clock(entry.start)}–${clock(entry.end)}`;
    if (entry.kind === "event") return [`- ${range} · compromisso: ${entry.title}`];
    const duration = `${entry.estimated ? "~" : ""}${formatPlanMinutes(entry.minutes)}${entry.estimated ? ", duração estimada" : ""}`;
    return [`- ${range} · tarefa: ${entry.title} (${duration}${entry.part ? `, parte ${entry.part.index} de ${entry.part.total}` : ""}) [id: ${entry.id}]`];
  });
  const status =
    plan.status === "sem_tarefas"
      ? `Sem tarefas com prazo no dia; ${formatPlanMinutes(plan.freeMinutes)} livres.`
      : plan.status === "cabe"
        ? `Tudo o que vence hoje cabe; as tarefas terminam por volta de ${plan.finishesAt ? clock(plan.finishesAt) : "—"}.${plan.overflow.length ? ` Ficam para outro dia (sem prazo hoje): ${plan.overflow.map((task) => `"${task.title}"`).join(", ")}.` : ""}`
        : `Não cabe tudo o que vence hoje: faltam ${formatPlanMinutes(plan.shortfallMinutes)}. Fora do plano: ${plan.overflow.map((task) => `"${task.title}" (${task.estimated ? "~" : ""}${formatPlanMinutes(task.minutes)}) [id: ${task.id}]`).join(", ")}. Proponha mover prazos ou ajustar durações; nada muda sem confirmação.`;
  return [header, ...lines, status].join("\n");
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
        "Visão geral de um dia (padrão: hoje): compromissos com horário, tarefas atrasadas e com prazo no dia, hábitos previstos, contas a vencer nos próximos 3 dias e o plano sugerido (sequência com horários dentro da janela de disponibilidade da pessoa, com 20% de folga). Use antes de planejar ou resumir o dia.",
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

        const [events, tasks, habits, logs, transactions, recurring, dayWindow] = await Promise.all([
          settle(listEventsInRange(client, start.toISOString(), end.toISOString())),
          settle(listActiveTasks(client)),
          settle(listHabits(client)),
          settle(listHabitLogsForDate(client, date)),
          settle(listTransactions(client, addDays(today, -60))),
          settle(listRecurringTransactions(client)),
          readDayWindow(client),
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

        if (events && tasks && date >= today) sections.push(describeDayPlan(planForDate(tasks, events, date, today, dayWindow), dayWindow));

        return { summary: sections.join("\n\n") };
      },
    },
  ];
}
