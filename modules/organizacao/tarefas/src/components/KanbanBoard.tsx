import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { TaskStatus, TaskWithConditions } from "../types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "nao_iniciado", label: "Não iniciado" },
  { status: "em_andamento", label: "Em andamento" },
  { status: "concluido", label: "Concluído" },
];

function KanbanColumn({
  status,
  label,
  tasks,
  onMove,
  onDelete,
  focusedTaskId,
  onFocus,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-semibold text-text-primary uppercase tracking-wide">{label}</h2>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[80px] rounded-md transition-colors ${
          isOver ? "bg-surface-1 outline-dashed outline-2 outline-brand-cyan" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onMove={(newStatus) => onMove(task.id, newStatus)}
            onDelete={() => onDelete(task.id)}
            isFocused={focusedTaskId === task.id}
            onFocus={() => onFocus?.(task.id, task.title)}
          />
        ))}
      </div>
    </div>
  );
}

/** "Mover tarefa no Kanban" via arrastar-e-soltar entre colunas (Web/Windows) — os botões "mover
 * para" continuam disponíveis como alternativa acessível/touch. */
export function KanbanBoard({
  tasks,
  onMove,
  onDelete,
  focusedTaskId,
  onFocus,
}: {
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    onMove(taskId, newStatus);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasks.filter((task) => task.status === column.status)}
            onMove={onMove}
            onDelete={onDelete}
            focusedTaskId={focusedTaskId}
            onFocus={onFocus}
          />
        ))}
      </div>
    </DndContext>
  );
}
