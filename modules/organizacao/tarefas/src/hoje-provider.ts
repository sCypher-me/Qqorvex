import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listActiveTasks } from "./repository";

/**
 * "Hoje pode mostrar resumo compacto: tarefas para hoje, atrasadas relevantes, em andamento,
 * prioridade alta. Não replicar o Kanban inteiro no Hoje." Hoje só chama esta função através
 * do registry — nunca importa este módulo diretamente.
 */
export function createTasksHojeProvider(client: SupabaseClient<Database>) {
  return async function tasksHojeProvider(): Promise<HojeItem[]> {
    const tasks = await listActiveTasks(client);
    const today = new Date().toISOString().slice(0, 10);

    return tasks
      .filter((task) => task.status !== "concluido")
      .filter(
        (task) =>
          task.due_date === today ||
          (task.due_date !== null && task.due_date < today) ||
          task.status === "em_andamento" ||
          task.priority === "alta",
      )
      .map((task) => ({
        id: task.id,
        source: "tarefas",
        title: task.title,
        time: task.due_date ?? undefined,
        priority: task.priority === "alta" ? ("importante" as const) : undefined,
      }));
  };
}
