import { useMemo, useState } from "react";
import { Card, Badge, Button, ConfirmDialog } from "@qqorvex/ui";
import type { TaskPriority, TaskStatus, TaskWithConditions } from "../types";

const STATUS_LABEL: Record<TaskStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  sem_prioridade: "Sem prioridade",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/**
 * "Todas as Tarefas" + "Tags & Filtros" — ao contrário do Kanban (só 3 estados ativos, sem
 * subtarefas), mostra tudo: canceladas (escondidas por padrão) e subtarefas, com filtro por
 * status/prioridade/tag. Cancelar não é um estado do Kanban (regra do módulo) — é a única tela
 * onde a flag `is_cancelled` é gerenciável.
 */
export function TaskListView({
  tasks,
  onChangeStatus,
  onToggleCancelled,
  onDelete,
}: {
  tasks: TaskWithConditions[];
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  onToggleCancelled: (taskId: string, isCancelled: boolean) => void;
  onDelete: (taskId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.tags))).sort(), [tasks]);

  const filtered = tasks
    .filter((t) => showCancelled || !t.is_cancelled)
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => !priorityFilter || t.priority === priorityFilter)
    .filter((t) => !tagFilter || t.tags.includes(tagFilter));

  const confirmTask = tasks.find((t) => t.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Todas as tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1 text-sm text-text-secondary-warm">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Mostrar canceladas
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma tarefa encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((task) => (
            <li key={task.id}>
              <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className={`font-sans text-sm text-text-primary ${task.is_cancelled ? "line-through text-text-secondary-warm" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge tone="info">{STATUS_LABEL[task.status]}</Badge>
                    {task.priority !== "sem_prioridade" && <Badge tone="warning">{PRIORITY_LABEL[task.priority]}</Badge>}
                    {task.isOverdue && <Badge tone="error">Atrasada</Badge>}
                    {task.isBlocked && <Badge tone="info">Bloqueada</Badge>}
                    {task.is_cancelled && <Badge tone="warning">Cancelada</Badge>}
                    {task.due_date && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary-warm">
                        {task.due_date}
                      </span>
                    )}
                    {task.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary-warm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!task.is_cancelled && (
                    <select
                      value={task.status}
                      onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
                      className="text-xs rounded-md border border-border bg-surface-1 px-1 py-1 text-text-primary"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button type="button" variant="chip" onClick={() => onToggleCancelled(task.id, !task.is_cancelled)}>
                    {task.is_cancelled ? "Reativar" : "Cancelar"}
                  </Button>
                  <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(task.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        isOpen={confirmTask !== null}
        title={`Excluir "${confirmTask?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmTask) onDelete(confirmTask.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
