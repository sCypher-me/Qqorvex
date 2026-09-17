import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Badge, Button, ConfirmDialog } from "@qqorvex/ui";
import type { TaskStatus, TaskWithConditions } from "../types";

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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prazo relativo ("hoje", "venceu ontem", "em 3 dias") — mesma referência UTC de `isOverdue`. */
export function formatDueDate(dueDate: string, isDone: boolean): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  const [year, month, day] = dueDate.split("-");
  const shortDate = `${day}/${month}${year === today.slice(0, 4) ? "" : `/${year}`}`;

  if (isDone) return { label: shortDate, className: "text-text-muted" };

  let label: string;
  if (diff === 0) label = "hoje";
  else if (diff === -1) label = "venceu ontem";
  else if (diff < -1) label = `venceu há ${-diff} dias`;
  else if (diff === 1) label = "amanhã";
  else if (diff <= 30) label = `em ${diff} dias`;
  else label = shortDate;

  const className = diff < 0 ? "text-error" : diff === 0 ? "text-warning" : "text-text-secondary";
  return { label, className };
}

export function TaskCard({
  task,
  onMove,
  onDelete,
  isFocused,
  onFocus,
}: {
  task: TaskWithConditions;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  isFocused?: boolean;
  onFocus?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const due = task.due_date ? formatDueDate(task.due_date, task.status === "concluido") : null;
  // Ações ficam recolhidas até o card receber o foco (clique ou teclado) — sem `onFocus`, sempre visíveis.
  const showActions = !onFocus || isFocused;

  return (
    <div
      ref={setNodeRef}
      onClick={onFocus}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`qv-tile group p-3 flex flex-col gap-[9px] hover:border-text-muted ${
        isFocused ? "border-vex-cyan-dark hover:border-vex-cyan-dark shadow-[0_0_0_1px_var(--color-vex-cyan-dark),0_0_16px_rgba(67,185,210,0.14)]" : ""
      } ${isDragging ? "opacity-50 z-10 relative" : ""}`}
    >
      <div {...listeners} {...attributes} className="flex flex-col gap-[9px] cursor-grab active:cursor-grabbing rounded-md focus-visible:outline-1 focus-visible:outline-vex-cyan-bright focus-visible:outline-offset-2">
        <span className="text-[13px] font-medium leading-[1.4] text-text-primary">{task.title}</span>

        {(task.tags.length > 0 || due || task.priority === "alta" || task.isBlocked) && (
          <div className="flex items-center gap-2 flex-wrap">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-text-secondary border border-border rounded-full px-2 py-0.5 leading-[1.35]"
              >
                {tag}
              </span>
            ))}
            {task.priority === "alta" && <Badge tone="warning">Alta prioridade</Badge>}
            {task.isBlocked && <Badge tone="warning">Bloqueada</Badge>}
            {due && (
              <span className={`font-mono text-[11px] ${due.className}`} title={task.due_date ?? undefined}>
                {due.label}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`${showActions ? "flex" : "hidden group-focus-within:flex"} flex-wrap gap-1.5 pt-0.5`}>
        {NEXT_STATUSES[task.status].map((status) => (
          <Button key={status} type="button" variant="quiet" size="xs" onClick={() => onMove(status)}>
            → {STATUS_LABEL[status]}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${task.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
