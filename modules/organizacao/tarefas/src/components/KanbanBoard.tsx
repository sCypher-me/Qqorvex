import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Button } from "@qqorvex/ui";
import type { TaskStatus, TaskWithConditions } from "../types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "nao_iniciado", label: "Não iniciado", accent: "var(--color-text-muted)" },
  { status: "em_andamento", label: "Em andamento", accent: "var(--color-vex-cyan)" },
  { status: "concluido", label: "Concluído", accent: "var(--color-success)" },
];

function KanbanColumn({
  status,
  label,
  accent,
  tasks,
  onMove,
  onDelete,
  focusedTaskId,
  onFocus,
  onAdd,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`qv-column p-[14px] flex flex-col gap-3 min-h-[220px] transition-colors ${
        isOver ? "border-vex-cyan-dark bg-[rgba(67,185,210,0.05)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[13px] font-semibold text-text-primary">{label}</span>
        <span className="flex-1" />
        <span className="font-mono text-xs text-text-muted">{tasks.length}</span>
      </div>

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

      {onAdd && (
        <Button type="button" variant="dashed" className="w-full py-[9px]" onClick={onAdd}>
          Adicionar
        </Button>
      )}
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
  onAdd,
}: {
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
  /** "Adicionar" na coluna "Não iniciado" — tarefa nova sempre nasce nesse estado. */
  onAdd?: () => void;
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px] items-start w-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            accent={column.accent}
            tasks={tasks.filter((task) => task.status === column.status)}
            onMove={onMove}
            onDelete={onDelete}
            focusedTaskId={focusedTaskId}
            onFocus={onFocus}
            onAdd={column.status === "nao_iniciado" ? onAdd : undefined}
          />
        ))}
      </div>
    </DndContext>
  );
}
