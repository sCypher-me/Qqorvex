import { FlagIcon, LockSimpleIcon, RepeatIcon } from "@phosphor-icons/react";
import { categoryColor } from "@qqorvex/design-system";
import { Tag, cx } from "@qqorvex/ui";
import { formatDueLabel, localDateKey } from "../service";
import type { TaskPriority, TaskStatus } from "../types";

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; short: string }> = {
  alta: { label: "Alta", short: "Alta", color: "var(--q-danger)" },
  media: { label: "Média", short: "Média", color: "var(--q-warning)" },
  baixa: { label: "Baixa", short: "Baixa", color: "var(--q-info)" },
  sem_prioridade: { label: "Sem prioridade", short: "—", color: "var(--q-fg-4)" },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  nao_iniciado: { label: "A fazer", color: "var(--q-fg-3)" },
  em_andamento: { label: "Em andamento", color: "var(--q-gold)" },
  concluido: { label: "Concluída", color: "var(--q-success)" },
};

export function PriorityFlag({ priority, withLabel = false }: { priority: TaskPriority; withLabel?: boolean }) {
  if (priority === "sem_prioridade") return null;
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-fg-3" title={`Prioridade ${meta.label.toLowerCase()}`}>
      <FlagIcon weight="fill" size={13} style={{ color: meta.color }} aria-hidden="true" />
      {withLabel ? meta.label : <span className="sr-only">Prioridade {meta.label.toLowerCase()}</span>}
    </span>
  );
}

export function DueChip({ dueDate, done = false, className }: { dueDate: string; done?: boolean; className?: string }) {
  const today = localDateKey();
  const overdue = !done && dueDate < today;
  const isToday = !done && dueDate === today;
  return (
    <span
      className={cx(
        "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-2xs font-medium tabular-nums",
        overdue ? "bg-danger-soft text-danger" : isToday ? "bg-gold-soft text-gold-fg" : "text-fg-3",
        className,
      )}
      title={overdue ? "Prazo vencido" : undefined}
    >
      {overdue ? `${formatDueLabel(dueDate, today)} · atrasada` : formatDueLabel(dueDate, today)}
    </span>
  );
}

export function TaskTags({ tags, max = 2 }: { tags: string[]; max?: number }) {
  if (!tags.length) return null;
  return (
    <span className="flex min-w-0 items-center gap-1">
      {tags.slice(0, max).map((tag) => (
        <Tag key={tag} color={categoryColor(tag)}>
          {tag}
        </Tag>
      ))}
      {tags.length > max && <span className="text-2xs text-fg-4">+{tags.length - max}</span>}
    </span>
  );
}

export function BlockedHint() {
  return (
    <span className="inline-flex items-center gap-1 text-2xs text-warning" title="Aguardando pré-requisitos">
      <LockSimpleIcon size={12} weight="bold" aria-hidden="true" />
      Bloqueada
    </span>
  );
}

export function RecurringHint() {
  return (
    <span className="inline-flex items-center text-fg-4" title="Tarefa recorrente">
      <RepeatIcon size={12} weight="bold" aria-hidden="true" />
      <span className="sr-only">Recorrente</span>
    </span>
  );
}

/** Círculo de conclusão (tarefas). */
export function CompleteToggle({ done, onToggle, label, disabled, size = 18 }: { done: boolean; onToggle: () => void; label: string; disabled?: boolean; size?: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{ width: size, height: size }}
      className={cx(
        "group/check relative flex shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] disabled:cursor-not-allowed disabled:opacity-40",
        done ? "border-success bg-success text-canvas" : "border-line-strong hover:border-success",
      )}
    >
      <svg viewBox="0 0 16 16" className={cx("h-[62%] w-[62%] transition-opacity", done ? "opacity-100" : "opacity-0 group-hover/check:opacity-60 group-hover/check:text-success")} aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
