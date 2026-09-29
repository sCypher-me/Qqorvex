import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PlusIcon } from "@phosphor-icons/react";
import { cx } from "@qqorvex/ui";
import { compareTasksForAction } from "../service";
import type { TaskStatus, TaskWithConditions } from "../types";
import { BlockedHint, CompleteToggle, DueChip, PriorityFlag, RecurringHint, STATUS_META, TaskTags } from "./TaskParts";
import type { TaskRowActions } from "./TaskRow";

const COLUMNS: TaskStatus[] = ["nao_iniciado", "em_andamento", "concluido"];

function BoardCard({ task, actions, overlay = false, meta }: { task: TaskWithConditions; actions: TaskRowActions; overlay?: boolean; meta?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: overlay });
  const done = task.status === "concluido";
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="Tarefa arrastável"
      aria-label={`${task.title}. Use espaço para pegar e setas para mover entre colunas.`}
      className={cx(
        "group flex min-w-0 cursor-grab touch-none flex-col gap-2 rounded-lg border border-line bg-raised p-3 text-left shadow-sm transition-[border-color,opacity] active:cursor-grabbing",
        "hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)]",
        isDragging && !overlay && "opacity-30",
        overlay && "rotate-[1.5deg] shadow-lg",
      )}
      onClick={() => actions.onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter") actions.onOpen(task);
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-px" onPointerDown={(event) => event.stopPropagation()}>
          <CompleteToggle done={done} size={16} label={done ? `Reabrir “${task.title}”` : `Concluir “${task.title}”`} onToggle={() => actions.onToggleComplete(task)} disabled={!done && task.isBlocked} />
        </span>
        <span className={cx("min-w-0 flex-1 text-[13px] font-medium leading-snug", done ? "text-fg-4 line-through" : "text-fg")}>{task.title}</span>
      </div>
      {(task.due_date || task.tags.length > 0 || task.priority !== "sem_prioridade" || task.isBlocked || meta || task.recurring_task_id) && (
        <div className="flex flex-wrap items-center gap-2 pl-[26px]">
          {task.due_date && <DueChip dueDate={task.due_date} done={done} className="-ml-1.5" />}
          <PriorityFlag priority={task.priority} />
          {task.isBlocked && !done && <BlockedHint />}
          {task.recurring_task_id && <RecurringHint />}
          {meta && <span className="text-2xs text-fg-4">{meta}</span>}
          <TaskTags tags={task.tags} max={2} />
        </div>
      )}
    </div>
  );
}

function BoardColumn({ status, tasks, actions, onAdd, metaFor }: { status: TaskStatus; tasks: TaskWithConditions[]; actions: TaskRowActions; onAdd?: () => void; metaFor?: (task: TaskWithConditions) => string | undefined }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label}, ${tasks.length} tarefas`}
      className={cx("flex min-h-[320px] min-w-[272px] flex-1 flex-col rounded-xl border bg-canvas/40 transition-colors", isOver ? "border-gold-line bg-gold-soft/40" : "border-line-soft")}
    >
      <header className="flex h-11 items-center gap-2 px-3">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
        <h3 className="text-[13px] font-semibold text-fg-2">{meta.label}</h3>
        <span className="text-xs tabular-nums text-fg-4">{tasks.length}</span>
        {onAdd && (
          <button type="button" onClick={onAdd} aria-label="Adicionar tarefa" className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg">
            <PlusIcon size={15} />
          </button>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        {tasks.map((task) => (
          <BoardCard key={task.id} task={task} actions={actions} meta={metaFor?.(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-fg-4">
            {isOver ? "Solte aqui" : status === "concluido" ? "Arraste para cá o que terminar" : status === "em_andamento" ? "Arraste para cá o que estiver fazendo" : "Nada a fazer por aqui"}
          </div>
        )}
      </div>
    </section>
  );
}

/** Quadro (kanban) com três estados de fluxo. Arrastar muda o status. */
export function TaskBoard({ tasks, actions, onAdd, metaFor }: { tasks: TaskWithConditions[]; actions: TaskRowActions; onAdd?: () => void; metaFor?: (task: TaskWithConditions) => string | undefined }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const sorted = [...tasks].sort(compareTasksForAction);
  const activeTask = sorted.find((task) => task.id === activeId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const status = event.over?.id as TaskStatus | undefined;
    const task = sorted.find((item) => item.id === event.active.id);
    if (!task || !status || task.status === status) return;
    actions.onChangeStatus(task, status);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={sorted.filter((task) => task.status === status && !task.is_cancelled).slice(0, status === "concluido" ? 30 : undefined)}
            actions={actions}
            onAdd={status === "nao_iniciado" ? onAdd : undefined}
            metaFor={metaFor}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{activeTask ? <BoardCard task={activeTask} actions={actions} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
