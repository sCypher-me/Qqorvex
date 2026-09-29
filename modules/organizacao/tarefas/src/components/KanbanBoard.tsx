import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowRightIcon, Button, CheckIcon, ConfirmDialog, PlusIcon } from "@qqorvex/ui";
import type { TaskStatus, TaskWithConditions } from "../types";
import { TaskCard } from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string; hint: string; accent: string }[] = [
  { status: "nao_iniciado", label: "Não iniciado", hint: "Próximos passos", accent: "var(--color-text-muted)" },
  { status: "em_andamento", label: "Em andamento", hint: "Foco atual", accent: "var(--color-vex-cyan)" },
  { status: "concluido", label: "Concluído", hint: "O que já avançou", accent: "var(--color-success)" },
];

function KanbanColumn({
  status,
  label,
  hint,
  accent,
  tasks,
  onMove,
  onDelete,
  focusedTaskId,
  onFocus,
  onOpenDetails,
  onAdd,
}: {
  status: TaskStatus;
  label: string;
  hint: string;
  accent: string;
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
  onOpenDetails?: (task: TaskWithConditions) => void;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`kanban-column-${status}`}
      className={`editorial-kanban-column flex min-h-[350px] flex-col border-t-2 pt-4 transition-[background-color,border-color] duration-200 ${
        isOver ? "border-brand-primary bg-chip-cyan/60" : "bg-transparent"
      }`}
      style={{ borderTopColor: accent }}
    >
      <div className="flex items-start gap-2 px-0 pb-5">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0 flex-1">
          <h3 id={`kanban-column-${status}`} className="m-0 text-sm font-semibold text-text-primary">{label}</h3>
          <p className="m-0 mt-1 text-[11px] text-text-muted">{hint}</p>
        </div>
        <span className="text-[11px] font-semibold text-text-muted">
          {tasks.length}
        </span>
      </div>

      <div
        aria-label={`Soltar tarefa em ${label}`}
        className={`flex flex-1 flex-col gap-2.5 rounded-[9px] border border-transparent transition-colors ${
          isOver ? "border-brand-primary bg-chip-cyan/40" : "bg-transparent"
        } ${tasks.length === 0 ? "justify-center" : ""}`}
      >
        {tasks.length === 0 ? (
          <div className="flex min-h-[205px] flex-col items-center justify-center px-5 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2/60 text-text-muted" aria-hidden="true">{status === "concluido" ? <CheckIcon size={20} /> : status === "em_andamento" ? <ArrowRightIcon size={20} /> : <PlusIcon size={20} />}</span>
            <p className="m-0 mt-3 text-xs font-medium text-text-secondary">{isOver ? "Solte a tarefa aqui" : status === "nao_iniciado" ? "Pronto para começar" : "Nada por aqui ainda"}</p>
            <p className="m-0 mt-1 max-w-[180px] text-[11px] leading-relaxed text-text-muted">
              {status === "nao_iniciado" ? "Capture uma tarefa e mova seu fluxo um passo de cada vez." : "Arraste uma tarefa para este estágio."}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMove={(newStatus) => onMove(task.id, newStatus)}
              onDelete={() => onDelete(task.id)}
              isFocused={focusedTaskId === task.id}
              onFocus={() => onFocus?.(task.id, task.title)}
              onOpenDetails={() => onOpenDetails?.(task)}
            />
          ))
        )}
      </div>

      {onAdd && (
        <Button type="button" variant="dashed" className="mt-3 w-full py-[9px]" onClick={onAdd}>
          <PlusIcon size={16} aria-hidden="true" />
          Nova tarefa
        </Button>
      )}
    </section>
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
  onOpenDetails,
  onAdd,
  dueTodayCount = 0,
}: {
  tasks: TaskWithConditions[];
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  focusedTaskId?: string | null;
  onFocus?: (taskId: string, title: string) => void;
  onOpenDetails?: (task: TaskWithConditions) => void;
  /** "Adicionar" na coluna "Não iniciado" — tarefa nova sempre nasce nesse estado. */
  onAdd?: () => void;
  dueTodayCount?: number;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);
  const [dragStatus, setDragStatus] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const taskId = String(event.active.id);
    setActiveTaskId(taskId);
    const task = tasks.find((item) => item.id === taskId);
    setDragStatus(task ? `Arrastando a tarefa ${task.title}` : "Arrastando tarefa");
  }

  function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as TaskStatus | undefined;
    const task = tasks.find((t) => t.id === taskId);
    if (task?.isBlocked && newStatus && task.status !== newStatus && newStatus !== "nao_iniciado") {
      setDragStatus(`Tarefa ${task.title} bloqueada; conclua os pré-requisitos antes de avançar`);
      setActiveTaskId(null);
      return;
    }
    if (task && newStatus && task.status !== newStatus) {
      onMove(taskId, newStatus);
      setDragStatus(`Tarefa ${task.title} movida para ${COLUMNS.find((column) => column.status === newStatus)?.label ?? "o novo estágio"}`);
    } else if (task) {
      setDragStatus(`Tarefa ${task.title} permaneceu no mesmo estágio`);
    }
    setActiveTaskId(null);
  }

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : undefined;
  const pendingDeleteTask = pendingDeleteTaskId ? tasks.find((task) => task.id === pendingDeleteTaskId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => {
        setActiveTaskId(null);
        setDragStatus("Arraste cancelado");
      }}
      onDragEnd={handleDragEnd}
    >
      <section aria-label={`Painel de tarefas, ${dueTodayCount} com prazo hoje`} className="editorial-kanban">
        <div className="grid w-full grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              hint={column.hint}
              accent={column.accent}
              tasks={tasks.filter((task) => task.status === column.status)}
              onMove={onMove}
              onDelete={(taskId) => setPendingDeleteTaskId(taskId)}
              focusedTaskId={focusedTaskId}
              onFocus={onFocus}
              onOpenDetails={onOpenDetails}
              onAdd={column.status === "nao_iniciado" ? onAdd : undefined}
            />
          ))}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">{dragStatus}</div>
      </section>
      <DragOverlay
        dropAnimation={{ duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {activeTask ? (
          <div className="w-[min(360px,calc(100vw-2rem))]">
            <TaskCard task={activeTask} onMove={() => undefined} onDelete={() => undefined} isDragPreview />
          </div>
        ) : null}
      </DragOverlay>
      <ConfirmDialog
        isOpen={pendingDeleteTaskId !== null && pendingDeleteTask !== undefined}
        title={`Excluir "${pendingDeleteTask?.title ?? "tarefa"}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (pendingDeleteTask) onDelete(pendingDeleteTask.id);
          setPendingDeleteTaskId(null);
        }}
        onCancel={() => setPendingDeleteTaskId(null)}
      />
    </DndContext>
  );
}
