import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Card, Badge, Button, ConfirmDialog } from "@qqorvex/ui";
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

  return (
    <Card
      ref={setNodeRef}
      onClick={onFocus}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`${isFocused ? "ring-2 ring-brand-cyan" : ""} ${isDragging ? "opacity-50 z-10 relative" : ""}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <p className="font-sans text-sm text-text-primary">{task.title}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.priority === "alta" && <Badge tone="warning">Alta prioridade</Badge>}
        {task.isOverdue && <Badge tone="error">Atrasada</Badge>}
        {task.isBlocked && <Badge tone="info">Bloqueada</Badge>}
        {task.due_date && (
          <span className="font-mono text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary-warm">
            {task.due_date}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {NEXT_STATUSES[task.status].map((status) => (
          <Button key={status} type="button" variant="chip" onClick={() => onMove(status)}>
            Mover para {STATUS_LABEL[status]}
          </Button>
        ))}
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
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
    </Card>
  );
}
