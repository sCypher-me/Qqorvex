import type { SupabaseClient, Database } from "@qqorvex/database";
import { createGoal, listGoals, listHabits, logHabit, updateGoalStatus, type GoalStatus } from "@qqorvex/module-metas-habitos";
import type { ToolDefinition } from "../types";

/** Ferramentas da Vex para Metas & Hábitos. Só chamam a API pública de `@qqorvex/module-metas-habitos`. */
export function createMetasHabitosTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_goals",
      description: "Lista as metas do usuário",
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
      description: "Cria uma nova meta",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui criar a meta: título vazio." };
        const goal = await createGoal(client, userId, { title });
        return { summary: `Meta criada: "${goal.title}".`, data: goal };
      },
    },
    {
      name: "update_goal_status_by_title",
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
      async execute(args) {
        const query = String(args.title ?? "")
          .trim()
          .toLowerCase();
        const goals = await listGoals(client);
        const match = goals.find((g) => g.title.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhuma meta parecida com "${args.title}".` };
        const updated = await updateGoalStatus(client, match.id, args.status as GoalStatus);
        return { summary: `Meta "${updated.title}" atualizada para status "${updated.status}".`, data: updated };
      },
    },
    {
      name: "log_habit_by_name",
      description: "Registra o hábito de hoje (estado 'concluído') pelo nome",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.name ?? "").trim().toLowerCase();
        const habits = await listHabits(client);
        const match = habits.find((h) => h.name.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhum hábito parecido com "${args.name}".` };
        const today = new Date().toISOString().slice(0, 10);
        await logHabit(client, match.id, today, "concluido");
        return { summary: `Hábito registrado hoje: "${match.name}".` };
      },
    },
  ];
}
