import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@qqorvex/auth";
import { Button, ChipTabs, Notice, Skeleton, SkeletonCards } from "@qqorvex/ui";
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
  TaskDetailsDialog,
  useUpdateTask,
} from "@qqorvex/module-tarefas";
import type { NewTaskInput, TaskStatus, TaskUpdateInput, TaskWithConditions } from "@qqorvex/module-tarefas";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";
import { localDateKey } from "@qqorvex/module-tarefas";

type ViewMode = "kanban" | "todas" | "recorrentes";
type Feedback = { tone: "success" | "error" | "info"; message: string };

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "kanban", label: "Painel" },
  { value: "todas", label: "Todas as Tarefas" },
  { value: "recorrentes", label: "Recorrentes" },
];

export function TarefasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = window.localStorage.getItem("qqorvex:tasks-view");
    return stored === "todas" || stored === "recorrentes" || stored === "kanban" ? stored : "kanban";
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithConditions | null>(null);
  const { currentItem, setCurrentItem } = useCurrentItem();
  const captureInputRef = useRef<HTMLInputElement>(null);
  const focusedCaptureForLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!location.state?.focusCapture || focusedCaptureForLocation.current === location.key) return;
    focusedCaptureForLocation.current = location.key;
    captureInputRef.current?.focus();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate]);

  const { tasks, isLoading, error: tasksError } = useTasks(supabase, userId);
  const { tasks: allTasks, isLoading: allTasksLoading, error: allTasksError } = useAllTasks(supabase);
  const createTask = useCreateTask(supabase, userId);
  const editTask = useUpdateTask(supabase);
  const updateStatus = useUpdateTaskStatus(supabase);
  const updateCancelled = useUpdateTaskCancelled(supabase);
  const deleteTask = useDeleteTask(supabase);

  useEffect(() => {
    window.localStorage.setItem("qqorvex:tasks-view", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function captureTask(input: NewTaskInput) {
    setFeedback(null);
    try {
      await createTask.mutateAsync(input);
      setFeedback({ tone: "success", message: "Tarefa criada no seu painel." });
    } catch {
      setFeedback({ tone: "error", message: "Não foi possível criar a tarefa. Seu rascunho foi mantido." });
      throw new Error("Falha ao criar tarefa");
    }
  }

  async function saveTask(taskId: string, updates: TaskUpdateInput) {
    await editTask.mutateAsync({ taskId, updates });
    setFeedback({ tone: "success", message: "Detalhes da tarefa atualizados." });
  }

  function moveTask(taskId: string, status: TaskStatus) {
    updateStatus.mutate(
      { taskId, status },
      {
        onSuccess: () => setFeedback({ tone: "success", message: "Tarefa movida com sucesso." }),
        onError: () => setFeedback({ tone: "error", message: "Não foi possível mover a tarefa." }),
      },
    );
  }

  function cancelTask(taskId: string, isCancelled: boolean) {
    updateCancelled.mutate(
      { taskId, isCancelled },
      {
        onSuccess: () => setFeedback({ tone: "success", message: isCancelled ? "Tarefa cancelada." : "Tarefa reativada." }),
        onError: () => setFeedback({ tone: "error", message: "Não foi possível atualizar a tarefa." }),
      },
    );
  }

  function removeTask(taskId: string) {
    deleteTask.mutate(taskId, {
      onSuccess: () => setFeedback({ tone: "success", message: "Tarefa excluída." }),
      onError: () => setFeedback({ tone: "error", message: "Não foi possível excluir a tarefa." }),
    });
  }

  const today = localDateKey();
  const dueTodayCount = tasks.filter((task) => task.due_date === today && task.status !== "concluido").length;
  const overdueCount = tasks.filter((task) => task.isOverdue && task.status !== "concluido").length;
  const completedCount = tasks.filter((task) => task.status === "concluido").length;

  function retryTasks() {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task-dependencies"] });
    queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
  }

  function openTaskEditor(task: TaskWithConditions | null = null) {
    if (task) setCurrentItem({ type: "tarefa", id: task.id, label: task.title });
    setSelectedTask(task);
    setIsTaskEditorOpen(true);
  }

  function closeTaskEditor() {
    setIsTaskEditorOpen(false);
    setSelectedTask(null);
  }

  return (
    <div className="qv-page editorial-tasks flex flex-col gap-[20px]">
      <header className="editorial-tasks-header flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="editorial-eyebrow m-0">ORGANIZAÇÃO</p>
          <h1 className="m-0 mt-4 text-[clamp(34px,4vw,53px)] font-bold leading-none tracking-[-0.055em] text-text-primary">Tarefas</h1>
          <p className="m-0 mt-3 max-w-[520px] text-[15px] leading-relaxed text-text-muted">Um espaço claro para transformar intenção em progresso.</p>
        </div>
      </header>

      {viewMode === "todas" ? (
        <div className="editorial-task-summary" aria-label="Resumo das tarefas">
          <span><strong>{tasks.filter((task) => task.status !== "concluido").length}</strong> ativas</span>
          <span><strong>{tasks.filter((task) => task.status === "em_andamento").length}</strong> em andamento</span>
          <span><strong>{dueTodayCount}</strong> para hoje</span>
          <span><strong>{completedCount}</strong> concluídas</span>
          {overdueCount > 0 && <span className="text-error"><strong>{overdueCount}</strong> atrasadas</span>}
        </div>
      ) : viewMode === "kanban" && (dueTodayCount > 0 || overdueCount > 0) ? (
        <div className="editorial-task-summary" aria-label="Prazos das tarefas">
          {dueTodayCount > 0 && <span><strong>{dueTodayCount}</strong> para hoje</span>}
          {overdueCount > 0 && <span className="text-error"><strong>{overdueCount}</strong> atrasadas</span>}
        </div>
      ) : null}

      {feedback && (
        <Notice tone={feedback.tone} className="py-3" actions={<button type="button" className="self-start text-xs underline underline-offset-4" onClick={() => setFeedback(null)}>Dispensar</button>}>
          {feedback.message}
        </Notice>
      )}

      <QuickCapture
        inputRef={captureInputRef}
        onCapture={captureTask}
        onPlan={() => openTaskEditor()}
        isSaving={createTask.isPending}
      />

      <ChipTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} className="editorial-task-tabs" />

      {viewMode === "kanban" ? (
        tasksError ? (
          <Notice
            tone="error"
            title="Não foi possível carregar o painel"
            actions={<Button type="button" variant="secondary" size="sm" onClick={retryTasks}>Tentar novamente</Button>}
          >
            Suas tarefas continuam salvas. Atualize a conexão para sincronizar o painel.
          </Notice>
        ) : isLoading ? (
          <div role="status" aria-label="Carregando" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onMove={moveTask}
            onDelete={removeTask}
            focusedTaskId={currentItem?.type === "tarefa" ? currentItem.id : null}
            onFocus={(taskId, title) => setCurrentItem({ type: "tarefa", id: taskId, label: title })}
            onOpenDetails={(task) => openTaskEditor(task)}
            onAdd={() => captureInputRef.current?.focus()}
            dueTodayCount={dueTodayCount}
          />
        )
      ) : viewMode === "todas" ? (
        allTasksError ? (
          <Notice
            tone="error"
            title="Não foi possível carregar todas as tarefas"
            actions={<Button type="button" variant="secondary" size="sm" onClick={retryTasks}>Tentar novamente</Button>}
          >
            Os filtros e tarefas completas não puderam ser sincronizados agora.
          </Notice>
        ) : allTasksLoading ? (
          <SkeletonCards count={4} className="h-14 w-full rounded-xl" />
        ) : (
          <TaskListView
            tasks={allTasks}
            onChangeStatus={moveTask}
            onToggleCancelled={cancelTask}
            onDelete={removeTask}
            onOpenDetails={(task) => openTaskEditor(task)}
          />
        )
      ) : (
        <RecurringTasksPanel client={supabase} userId={userId} onRetry={retryTasks} />
      )}

      <TaskDetailsDialog
        isOpen={isTaskEditorOpen}
        task={selectedTask}
        tasks={allTasks}
        client={supabase}
        onClose={closeTaskEditor}
        onCreate={captureTask}
        onUpdate={saveTask}
      />
    </div>
  );
}
