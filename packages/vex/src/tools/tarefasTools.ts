import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  compareTasksForAction,
  createTask,
  dueBucketOf,
  listActiveTasks,
  updateTask,
  updateTaskStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@qqorvex/module-tarefas";
import type { ToolDefinition } from "../types";
import { addDays, ambiguousSummary, formatDateKey, isDateKey, localDateKey, matchByName } from "./shared";

const PRIORITY_LABEL: Record<TaskPriority, string> = { alta: "alta", media: "média", baixa: "baixa", sem_prioridade: "sem prioridade" };
const STATUS_LABEL: Record<TaskStatus, string> = { nao_iniciado: "a fazer", em_andamento: "em andamento", concluido: "concluída" };

export function describeTask(task: Task, today = localDateKey()): string {
  const parts = [task.title];
  if (task.due_date) parts.push(`prazo ${formatDateKey(task.due_date, today)} (${task.due_date})`);
  if (task.priority !== "sem_prioridade") parts.push(`prioridade ${PRIORITY_LABEL[task.priority]}`);
  if (task.status === "em_andamento") parts.push("em andamento");
  return `- ${parts.join(" · ")} [id: ${task.id}]`;
}

/**
 * Ferramentas da Vex para Tarefas. Só chamam a API pública de `@qqorvex/module-tarefas`.
 * Consulta executa direto; criar, concluir e editar exigem confirmação.
 */
export function createTarefasTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_tasks",
      label: "Tarefas",
      description:
        "Lista as tarefas em aberto do usuário com prazo, prioridade e id. Use scope para filtrar: hoje (vencem hoje), atrasadas, semana (próximos 7 dias, incluindo atrasadas), sem_prazo ou todas.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["todas", "hoje", "atrasadas", "semana", "sem_prazo"], description: "Filtro (padrão: todas)" },
        },
      },
      requiresConfirmation: false,
      async execute(args) {
        const today = localDateKey();
        const scope = typeof args.scope === "string" ? args.scope : "todas";
        const open = (await listActiveTasks(client)).filter((task) => task.status !== "concluido").sort(compareTasksForAction);
        const weekEnd = addDays(today, 7);
        const filtered = open.filter((task) => {
          const bucket = dueBucketOf(task.due_date, today);
          if (scope === "hoje") return bucket === "hoje";
          if (scope === "atrasadas") return bucket === "atrasadas";
          if (scope === "sem_prazo") return bucket === "sem_prazo";
          if (scope === "semana") return task.due_date !== null && task.due_date <= weekEnd;
          return true;
        });
        if (filtered.length === 0) {
          return { summary: scope === "todas" ? "Nenhuma tarefa em aberto." : `Nenhuma tarefa em aberto no filtro "${scope}". Total em aberto: ${open.length}.` };
        }
        const shown = filtered.slice(0, 40);
        const more = filtered.length > shown.length ? `\n(+${filtered.length - shown.length} outras)` : "";
        return { summary: `${filtered.length} tarefa(s) em aberto${scope === "todas" ? "" : ` (${scope})`}:\n${shown.map((task) => describeTask(task, today)).join("\n")}${more}`, data: filtered };
      },
    },
    {
      name: "create_task",
      label: "Tarefas",
      description:
        "Cria uma tarefa. Informe dueDate (AAAA-MM-DD) quando a pessoa citar um prazo e priority quando ela indicar urgência. Use description para um conteúdo mais longo (ex.: algo pesquisado na conversa).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título curto e acionável" },
          description: { type: "string", description: "Detalhes (opcional)" },
          dueDate: { type: "string", description: "Prazo AAAA-MM-DD (opcional)" },
          priority: { type: "string", enum: ["alta", "media", "baixa", "sem_prioridade"], description: "Prioridade (opcional)" },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Criar tarefa",
        fields: [
          { label: "Tarefa", value: String(args.title ?? "") },
          ...(isDateKey(args.dueDate) ? [{ label: "Prazo", value: formatDateKey(args.dueDate) }] : []),
          ...(typeof args.priority === "string" && args.priority !== "sem_prioridade" ? [{ label: "Prioridade", value: PRIORITY_LABEL[args.priority as TaskPriority] ?? args.priority }] : []),
          ...(args.description ? [{ label: "Detalhes", value: String(args.description) }] : []),
        ],
      }),
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui criar a tarefa: título vazio." };
        if (args.dueDate !== undefined && !isDateKey(args.dueDate)) return { summary: "Não criei a tarefa: o prazo precisa estar no formato AAAA-MM-DD." };
        const task = await createTask(client, userId, {
          title,
          description: args.description ? String(args.description) : undefined,
          dueDate: isDateKey(args.dueDate) ? args.dueDate : undefined,
          priority: typeof args.priority === "string" ? (args.priority as TaskPriority) : undefined,
        });
        return { summary: `Tarefa criada: "${task.title}"${task.due_date ? ` para ${formatDateKey(task.due_date)}` : ""}.`, data: task };
      },
    },
    {
      name: "complete_task_by_title",
      label: "Tarefas",
      description: "Marca como concluída a tarefa em aberto cujo título corresponde ao informado",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Título (ou parte dele) da tarefa" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      preview: (args) => ({ title: "Concluir tarefa", fields: [{ label: "Tarefa", value: String(args.title ?? "") }] }),
      async execute(args) {
        const open = (await listActiveTasks(client)).filter((task) => task.status !== "concluido");
        const match = matchByName(open, String(args.title ?? ""), (task) => task.title);
        if (match.kind === "none") return { summary: `Não encontrei nenhuma tarefa em aberto parecida com "${args.title}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("uma tarefa", match.items, (task) => task.title) };
        const updated = await updateTaskStatus(client, match.item.id, "concluido");
        return { summary: `Tarefa concluída: "${updated.title}".`, data: updated };
      },
    },
    {
      name: "update_task_by_id",
      label: "Tarefas",
      description:
        "Atualiza título, prazo, prioridade e/ou status de uma tarefa pelo id exato (os ids aparecem em list_tasks e no item em foco). Use para reagendar ou priorizar.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID da tarefa" },
          title: { type: "string", description: "Novo título (opcional)" },
          dueDate: { type: "string", description: "Novo prazo AAAA-MM-DD (opcional)" },
          priority: { type: "string", enum: ["alta", "media", "baixa", "sem_prioridade"], description: "Nova prioridade (opcional)" },
          status: { type: "string", enum: ["nao_iniciado", "em_andamento", "concluido"], description: "Novo status (opcional)" },
        },
        required: ["taskId"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Atualizar tarefa",
        fields: [
          ...(args.title ? [{ label: "Novo título", value: String(args.title) }] : []),
          ...(isDateKey(args.dueDate) ? [{ label: "Novo prazo", value: formatDateKey(args.dueDate) }] : []),
          ...(typeof args.priority === "string" ? [{ label: "Prioridade", value: PRIORITY_LABEL[args.priority as TaskPriority] ?? args.priority }] : []),
          ...(typeof args.status === "string" ? [{ label: "Status", value: STATUS_LABEL[args.status as TaskStatus] ?? args.status }] : []),
        ],
      }),
      async execute(args) {
        const taskId = String(args.taskId ?? "").trim();
        if (!taskId) return { summary: "Não recebi o ID da tarefa a atualizar." };
        if (args.dueDate !== undefined && !isDateKey(args.dueDate)) return { summary: "Não atualizei: o prazo precisa estar no formato AAAA-MM-DD." };
        const updated = await updateTask(client, taskId, {
          title: args.title as string | undefined,
          dueDate: args.dueDate as string | undefined,
          priority: args.priority as TaskPriority | undefined,
          status: args.status as TaskStatus | undefined,
        });
        return { summary: `Tarefa atualizada: "${updated.title}"${updated.due_date ? ` (prazo ${formatDateKey(updated.due_date)})` : ""}.`, data: updated };
      },
    },
  ];
}
