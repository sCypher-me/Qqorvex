import type { SupabaseClient, Database } from "@qqorvex/database";
import { createGoal, habitScheduleOn, listGoals, listHabitLogsForDate, listHabits, logHabit, updateGoalStatus, type GoalStatus } from "@qqorvex/module-metas-habitos";
import type { ToolDefinition } from "../types";
import { ambiguousSummary, formatDateKey, isDateKey, localDateKey, matchByName } from "./shared";

const GOAL_STATUS_LABEL: Record<string, string> = { planejada: "planejada", ativa: "ativa", pausada: "pausada", concluida: "concluída", cancelada: "cancelada" };

/** Ferramentas da Vex para Metas & Hábitos. Só chamam a API pública de `@qqorvex/module-metas-habitos`. */
export function createMetasHabitosTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_goals",
      label: "Metas",
      description: "Lista as metas do usuário com status",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const goals = await listGoals(client);
        if (goals.length === 0) return { summary: "Você não tem metas cadastradas." };
        const lines = goals.map((g) => `- [${g.status}] ${g.title}`).join("\n");
        return { summary: `Suas metas:\n${lines}`, data: goals };
      },
    },
    {
      name: "create_goal",
      label: "Metas",
      description: "Cria uma nova meta",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      preview: (args) => ({ title: "Criar meta", fields: [{ label: "Meta", value: String(args.title ?? "") }] }),
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui criar a meta: título vazio." };
        const goal = await createGoal(client, userId, { title });
        return { summary: `Meta criada: "${goal.title}".`, data: goal };
      },
    },
    {
      name: "update_goal_status_by_title",
      label: "Metas",
      description: "Atualiza o status de uma meta (planejada/ativa/pausada/concluida/cancelada) pelo título",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título (ou parte dele) da meta" },
          status: { type: "string", enum: ["planejada", "ativa", "pausada", "concluida", "cancelada"] },
        },
        required: ["title", "status"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Atualizar meta",
        fields: [
          { label: "Meta", value: String(args.title ?? "") },
          { label: "Novo status", value: GOAL_STATUS_LABEL[String(args.status)] ?? String(args.status ?? "") },
        ],
      }),
      async execute(args) {
        const goals = await listGoals(client);
        const match = matchByName(goals, String(args.title ?? ""), (goal) => goal.title);
        if (match.kind === "none") return { summary: `Não encontrei nenhuma meta parecida com "${args.title}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("uma meta", match.items, (goal) => goal.title) };
        const updated = await updateGoalStatus(client, match.item.id, args.status as GoalStatus);
        return { summary: `Meta "${updated.title}" agora está ${GOAL_STATUS_LABEL[updated.status] ?? updated.status}.`, data: updated };
      },
    },
    {
      name: "list_habits_today",
      label: "Hábitos",
      description: "Lista os hábitos previstos para hoje (ou para a data informada) e se já foram feitos",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "Data AAAA-MM-DD (padrão: hoje)" } },
      },
      requiresConfirmation: false,
      async execute(args) {
        const date = isDateKey(args.date) ? args.date : localDateKey();
        const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
        const [habits, logs] = await Promise.all([listHabits(client), listHabitLogsForDate(client, date)]);
        const stateById = new Map(logs.map((log) => [log.habit_id, log.state]));
        const due = habits.filter((habit) => habitScheduleOn(habit, new Date(y, m - 1, d)) !== null);
        if (due.length === 0) return { summary: `Nenhum hábito previsto para ${formatDateKey(date)}.` };
        const lines = due.map((habit) => {
          const state = stateById.get(habit.id);
          const flexible = habitScheduleOn(habit, new Date(y, m - 1, d)) === "flexivel" ? " (meta semanal, dia livre)" : "";
          return `- ${habit.name}${flexible}: ${state === "concluido" ? "feito" : state === "pulado" ? "pulado" : state === "parcial" ? "parcial" : "pendente"}`;
        });
        const done = due.filter((habit) => stateById.get(habit.id) === "concluido").length;
        return { summary: `Hábitos de ${formatDateKey(date)} (${done}/${due.length} feitos):\n${lines.join("\n")}`, data: due };
      },
    },
    {
      name: "log_habit_by_name",
      label: "Hábitos",
      description: "Marca um hábito como feito hoje (ou na data informada) pelo nome",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          date: { type: "string", description: "Data AAAA-MM-DD (padrão: hoje)" },
        },
        required: ["name"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Registrar hábito",
        fields: [
          { label: "Hábito", value: String(args.name ?? "") },
          { label: "Dia", value: isDateKey(args.date) ? formatDateKey(args.date) : "hoje" },
        ],
      }),
      async execute(args) {
        const habits = (await listHabits(client)).filter((habit) => habit.status === "ativo");
        const match = matchByName(habits, String(args.name ?? ""), (habit) => habit.name);
        if (match.kind === "none") return { summary: `Não encontrei nenhum hábito ativo parecido com "${args.name}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("um hábito", match.items, (habit) => habit.name) };
        const date = isDateKey(args.date) ? args.date : localDateKey();
        await logHabit(client, match.item.id, date, "concluido");
        return { summary: `Hábito registrado ${formatDateKey(date)}: "${match.item.name}".` };
      },
    },
  ];
}
