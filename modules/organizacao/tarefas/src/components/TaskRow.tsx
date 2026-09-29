import { ArrowCounterClockwiseIcon, DotsThreeIcon, PlayIcon, ProhibitIcon, TrashIcon } from "@phosphor-icons/react";
import { DropdownMenu, cx } from "@qqorvex/ui";
import type { TaskStatus, TaskWithConditions } from "../types";
import { BlockedHint, CompleteToggle, DueChip, PriorityFlag, RecurringHint, TaskTags } from "./TaskParts";

export interface TaskRowActions {
  onToggleComplete: (task: TaskWithConditions) => void;
  onOpen: (task: TaskWithConditions) => void;
  onChangeStatus: (task: TaskWithConditions, status: TaskStatus) => void;
  onToggleCancelled?: (task: TaskWithConditions) => void;
  onDelete: (task: TaskWithConditions) => void;
}

export function TaskRow({
  task,
  actions,
  selected = false,
  meta,
}: {
  task: TaskWithConditions;
  actions: TaskRowActions;
  selected?: boolean;
  /** Metadados extras (ex.: "2/5 passos"). */
  meta?: string;
}) {
  const done = task.status === "concluido";
  const inProgress = task.status === "em_andamento";

  return (
    <li
      className={cx(
        "group relative flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors sm:px-4",
        selected ? "bg-selected" : "hover:bg-hover",
        task.is_cancelled && "opacity-60",
      )}
    >
      <CompleteToggle done={done} label={done ? `Reabrir “${task.title}”` : `Concluir “${task.title}”`} onToggle={() => actions.onToggleComplete(task)} disabled={task.is_cancelled || (!done && task.isBlocked)} />
      <button type="button" onClick={() => actions.onOpen(task)} className="flex min-w-0 flex-1 flex-col items-start text-left outline-none focus-visible:underline">
        <span className={cx("max-w-full truncate text-[13.5px] leading-snug", done || task.is_cancelled ? "text-fg-4 line-through decoration-fg-4/60" : "text-fg")}>{task.title}</span>
        {(inProgress || task.isBlocked || task.recurring_task_id || meta || task.estimated_minutes || task.is_cancelled) && (
          <span className="mt-0.5 flex max-w-full items-center gap-2 text-2xs text-fg-4">
            {inProgress && !done && (
              <span className="inline-flex items-center gap-1 font-medium text-gold-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
                Em andamento
              </span>
            )}
            {task.is_cancelled && <span>Cancelada</span>}
            {task.isBlocked && !done && <BlockedHint />}
            {task.recurring_task_id && <RecurringHint />}
            {meta && <span className="truncate">{meta}</span>}
            {task.estimated_minutes ? <span className="tabular-nums">{task.estimated_minutes} min</span> : null}
          </span>
        )}
      </button>
      <span className="hidden items-center gap-2 sm:flex">
        <TaskTags tags={task.tags} />
      </span>
      <PriorityFlag priority={task.priority} />
      {task.due_date && <DueChip dueDate={task.due_date} done={done || task.is_cancelled} />}
      <DropdownMenu
        label={`Ações para ${task.title}`}
        items={[
          ...(task.status !== "em_andamento" && !done ? [{ label: "Começar agora", icon: <PlayIcon />, onSelect: () => actions.onChangeStatus(task, "em_andamento") }] : []),
          ...(task.status === "em_andamento" ? [{ label: "Voltar para a fazer", icon: <ArrowCounterClockwiseIcon />, onSelect: () => actions.onChangeStatus(task, "nao_iniciado") }] : []),
          ...(actions.onToggleCancelled ? [{ label: task.is_cancelled ? "Reativar" : "Cancelar tarefa", icon: <ProhibitIcon />, onSelect: () => actions.onToggleCancelled?.(task) }] : []),
          "separator" as const,
          { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => actions.onDelete(task) },
        ]}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label={`Mais ações para ${task.title}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-4 opacity-100 transition-opacity hover:bg-selected hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
          >
            <DotsThreeIcon size={18} weight="bold" />
          </button>
        )}
      />
    </li>
  );
}
