import { useRef, useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { ChipTabs, Skeleton, SkeletonCards } from "@qqorvex/ui";
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

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "todas", label: "Todas as Tarefas" },
  { value: "recorrentes", label: "Recorrentes" },
];

export function TarefasPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const { currentItem, setCurrentItem } = useCurrentItem();
  const captureInputRef = useRef<HTMLInputElement>(null);

  const { tasks, isLoading } = useTasks(supabase);
  const { tasks: allTasks, isLoading: allTasksLoading } = useAllTasks(supabase);
  const createTask = useCreateTask(supabase, userId);
  const updateStatus = useUpdateTaskStatus(supabase);
  const updateCancelled = useUpdateTaskCancelled(supabase);
  const deleteTask = useDeleteTask(supabase);

  return (
    <div className="flex flex-col gap-[18px]">
      <QuickCapture inputRef={captureInputRef} onCapture={(title) => createTask.mutate({ title })} />

      <ChipTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />

      {viewMode === "kanban" ? (
        isLoading ? (
          <div role="status" aria-label="Carregando" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onMove={(taskId, status) => updateStatus.mutate({ taskId, status })}
            onDelete={(taskId) => deleteTask.mutate(taskId)}
            focusedTaskId={currentItem?.type === "tarefa" ? currentItem.id : null}
            onFocus={(taskId, title) => setCurrentItem({ type: "tarefa", id: taskId, label: title })}
            onAdd={() => captureInputRef.current?.focus()}
          />
        )
      ) : viewMode === "todas" ? (
        allTasksLoading ? (
          <SkeletonCards count={4} className="h-14 w-full rounded-xl" />
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
  );
}
