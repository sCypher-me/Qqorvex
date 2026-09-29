import { type KeyboardEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ArrowRightIcon, Badge, Button, DotsSixVerticalIcon } from "@qqorvex/ui";
import type { TaskStatus, TaskWithConditions } from "../types";
import { localDateKey } from "../service";

const STATUS_LABEL: Record<TaskStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  nao_iniciado: ["em_andamento"],
  em_andamento: ["nao_iniciado", "concluido"],
  concluido: ["em_andamento"],
};
const PRIORITY_LABELS = { sem_prioridade: "Sem prioridade", baixa: "Baixa", media: "Média", alta: "Alta" } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDueDate(dueDate: string, isDone: boolean): { label: string; className: string } {
  const today = localDateKey();
  const diff = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  const [year, month, day] = dueDate.split("-");
  const shortDate = `${day}/${month}${year === today.slice(0, 4) ? "" : `/${year}`}`;
  if (isDone) return { label: shortDate, className: "text-text-muted" };
  const label = diff === 0 ? "hoje" : diff === -1 ? "venceu ontem" : diff < -1 ? `venceu há ${-diff} dias` : diff === 1 ? "amanhã" : diff <= 30 ? `em ${diff} dias` : shortDate;
  return { label, className: diff < 0 ? "text-error" : diff === 0 ? "text-warning" : "text-text-muted" };
}

export function TaskCard({
  task,
  onMove,
  onDelete,
  isFocused,
  onFocus,
  onOpenDetails,
  isDragPreview = false,
}: {
  task: TaskWithConditions;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onOpenDetails?: () => void;
  isDragPreview?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: isDragPreview });
  const due = task.due_date ? formatDueDate(task.due_date, task.status === "concluido") : null;
  const category = task.tags[0] || "Tarefa";

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onFocus || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onFocus();
  }

  return (
    <article
      ref={setNodeRef}
      tabIndex={onFocus ? 0 : undefined}
      aria-label={`Tarefa: ${task.title}`}
      onClick={isDragPreview ? undefined : onFocus}
      onKeyDown={handleKeyDown}
      style={isDragPreview ? { transform: "rotate(0.6deg) scale(1.015)", boxShadow: "0 18px 36px rgb(0 0 0 / .25)" } : undefined}
      className={`editorial-task-card flex min-w-0 flex-col border p-[18px] transition-[opacity,border-color] duration-150 ${isFocused ? "border-brand-primary" : "border-border"} ${isDragging && !isDragPreview ? "pointer-events-none opacity-25" : ""} ${isDragPreview ? "cursor-grabbing" : ""}`}
    >
      <div {...(isDragPreview ? {} : listeners)} {...(isDragPreview ? {} : attributes)} role={isDragPreview ? undefined : "button"} aria-label={isDragPreview ? undefined : `Arrastar tarefa ${task.title}`} className="cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-brand-primary">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="rounded-[5px] bg-chip-cyan px-2 py-1 text-[10px] font-semibold text-brand-primary">{category}</span>
          {task.priority !== "sem_prioridade" && <Badge tone={task.priority === "alta" ? "warning" : task.priority === "media" ? "info" : "neutral"}>{PRIORITY_LABELS[task.priority]}</Badge>}
          <span className={`ml-auto whitespace-nowrap text-[10px] ${due?.className ?? "text-text-muted"}`}>{due?.label ?? "Sem prazo"}</span>
          <DotsSixVerticalIcon size={17} className="text-text-muted" aria-hidden="true" />
        </div>
        <h3 className="m-0 text-[14px] font-bold leading-[1.4] text-text-primary">{task.title}</h3>
        {task.description && <p className="m-0 mt-1 line-clamp-2 text-[12px] leading-relaxed text-text-muted">{task.description}</p>}
        {(task.isBlocked || task.estimated_minutes || task.tags.length > 1) && <div className="mt-3 flex flex-wrap items-center gap-1.5">{task.isBlocked && <Badge tone="warning">Aguardando pré-requisito</Badge>}{task.tags.slice(1).map((tag) => <span key={tag} className="text-[10px] text-text-muted">{tag}</span>)}{task.estimated_minutes && <span className="text-[10px] text-text-muted">{task.estimated_minutes} min</span>}</div>}
      </div>
      {!isDragPreview && <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-3">
        {onOpenDetails && <Button type="button" variant="quiet" size="xs" onClick={(event) => { event.stopPropagation(); onOpenDetails(); }} className="!min-h-7 !px-2 !text-[10px]">Detalhes</Button>}
        <span className="mr-auto text-[10px] text-text-muted">Mover para</span>
        {NEXT_STATUSES[task.status].map((status) => <Button key={status} type="button" variant="quiet" size="xs" disabled={task.isBlocked && status !== "nao_iniciado"} title={task.isBlocked && status !== "nao_iniciado" ? "Conclua os pré-requisitos para avançar" : undefined} onClick={(event) => { event.stopPropagation(); onMove(status); }} className="!min-h-7 !px-2 !text-[10px]">{status === "concluido" ? "Concluir" : STATUS_LABEL[status]}<ArrowRightIcon size={12} /></Button>)}
        <Button type="button" variant="ghost" size="xs" onClick={onDelete} className="!min-h-7 !px-2 !text-[10px]">Excluir</Button>
      </div>}
    </article>
  );
}
