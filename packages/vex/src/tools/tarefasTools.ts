import type { SupabaseClient, Database } from "@qqorvex/database";
import { createTask, listActiveTasks, updateTask, updateTaskStatus, type TaskStatus } from "@qqorvex/module-tarefas";
import type { ToolDefinition } from "../types";

/**
 * Ferramentas da Vex para Produtividade & Tarefas. "A Vex não acessa o Supabase diretamente" —
 * estas funções só chamam a API pública do módulo (`@qqorvex/module-tarefas`), que por sua vez
 * fala com o Supabase. Consulta (list_tasks) executa direto; criar/concluir exigem confirmação
 * por serem mudanças persistentes.
 */
export function createTarefasTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_tasks",
      description: "Lista as tarefas ativas do usuário",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const tasks = await listActiveTasks(client);
        if (tasks.length === 0) return { summary: "Você não tem tarefas ativas no momento." };
        const lines = tasks.map((t) => `- [${t.status}] ${t.title}`).join("\n");
        return { summary: `Suas tarefas ativas:\n${lines}`, data: tasks };
      },
    },
    {
      name: "create_task",
      description:
        "Cria uma nova tarefa em Produtividade & Tarefas. Use description para guardar um conteúdo mais longo (ex.: algo pesquisado na conversa que o usuário pediu para virar tarefa).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição/conteúdo mais longo (opcional)" },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui criar a tarefa: título vazio." };
        const description = args.description ? String(args.description) : undefined;
        const task = await createTask(client, userId, { title, description });
        return { summary: `Tarefa criada: "${task.title}".`, data: task };
      },
    },
    {
      name: "complete_task_by_title",
      description: "Marca como concluída a tarefa ativa cujo título corresponde ao informado",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Título (ou parte dele) da tarefa" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.title ?? "")
          .trim()
          .toLowerCase();
        const tasks = await listActiveTasks(client);
        const match = tasks.find((t) => t.title.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhuma tarefa ativa parecida com "${args.title}".` };
        const updated = await updateTaskStatus(client, match.id, "concluido");
        return { summary: `Tarefa concluída: "${updated.title}".`, data: updated };
      },
    },
    {
      name: "update_task_by_id",
      description:
        "Atualiza título, prazo e/ou status de uma tarefa pelo ID exato — use quando souber o ID da tarefa (ex.: a pessoa está vendo essa tarefa na tela agora), em vez de tentar achar por título",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID da tarefa" },
          title: { type: "string", description: "Novo título (opcional)" },
          dueDate: { type: "string", description: "Novo prazo no formato AAAA-MM-DD (opcional)" },
          status: {
            type: "string",
            enum: ["nao_iniciado", "em_andamento", "concluido"],
            description: "Novo status (opcional)",
          },
        },
        required: ["taskId"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const taskId = String(args.taskId ?? "").trim();
        if (!taskId) return { summary: "Não recebi o ID da tarefa a atualizar." };
        const updated = await updateTask(client, taskId, {
          title: args.title as string | undefined,
          dueDate: args.dueDate as string | undefined,
          status: args.status as TaskStatus | undefined,
        });
        return { summary: `Tarefa atualizada: "${updated.title}".`, data: updated };
      },
    },
  ];
}
