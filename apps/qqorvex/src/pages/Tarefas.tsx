import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button } from "@qqorvex/ui";
import {
  useTasks,
  useAllTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useUpdateTaskCancelled,
  useDeleteTask,
  QuickCapture,
  KanbanBoard,
  TaskListView,
  RecurringTasksPanel,
} from "@qqorvex/module-tarefas";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";

type ViewMode = "kanban" | "todas" | "recorrentes";

const VIEW_LABEL: Record<ViewMode, string> = { kanban: "Kanban", todas: "Todas as Tarefas", recorrentes: "Recorrentes" };

export function TarefasPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const { currentItem, setCurrentItem } = useCurrentItem();

  const { tasks, isLoading } = useTasks(supabase);
  const { tasks: allTasks, isLoading: allTasksLoading } = useAllTasks(supabase);
  const createTask = useCreateTask(supabase, userId);
  const updateStatus = useUpdateTaskStatus(supabase);
  const updateCancelled = useUpdateTaskCancelled(supabase);
  const deleteTask = useDeleteTask(supabase);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Tarefas</h1>
      </div>

      <div className="w-full max-w-4xl">
        <QuickCapture onCapture={(title) => createTask.mutate({ title })} />
      </div>

      <div className="w-full max-w-4xl flex gap-2">
        {(Object.keys(VIEW_LABEL) as ViewMode[]).map((view) => (
          <Button key={view} type="button" variant={viewMode === view ? "chip-accent" : "chip"} onClick={() => setViewMode(view)}>
            {VIEW_LABEL[view]}
          </Button>
        ))}
      </div>

      <div className="w-full max-w-4xl">
        {viewMode === "kanban" ? (
          isLoading ? (
            <p className="font-sans text-text-secondary-warm">Carregando...</p>
          ) : (
            <KanbanBoard
              tasks={tasks}
              onMove={(taskId, status) => updateStatus.mutate({ taskId, status })}
              onDelete={(taskId) => deleteTask.mutate(taskId)}
              focusedTaskId={currentItem?.type === "tarefa" ? currentItem.id : null}
              onFocus={(taskId, title) => setCurrentItem({ type: "tarefa", id: taskId, label: title })}
            />
          )
        ) : viewMode === "todas" ? (
          allTasksLoading ? (
            <p className="font-sans text-text-secondary-warm">Carregando...</p>
          ) : (
            <TaskListView
              tasks={allTasks}
              onChangeStatus={(taskId, status) => updateStatus.mutate({ taskId, status })}
              onToggleCancelled={(taskId, isCancelled) => updateCancelled.mutate({ taskId, isCancelled })}
              onDelete={(taskId) => deleteTask.mutate(taskId)}
            />
          )
        ) : (
          <RecurringTasksPanel client={supabase} userId={userId} />
        )}
      </div>
    </main>
  );
}
