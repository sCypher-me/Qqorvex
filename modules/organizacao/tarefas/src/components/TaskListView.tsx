import { useMemo, useState } from "react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@qqorvex/ui";
import type { TaskPriority, TaskStatus, TaskWithConditions } from "../types";
import { formatDueDate } from "./TaskCard";

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

const FILTER_CLASS = "qv-field w-auto py-2 px-3 text-[13px]";

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
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por status"
          className={FILTER_CLASS}
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
          aria-label="Filtrar por prioridade"
          className={FILTER_CLASS}
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
            aria-label="Filtrar por tag"
            className={FILTER_CLASS}
          >
            <option value="">Todas as tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-[13px] text-text-secondary ml-1 cursor-pointer">
          <input
            type="checkbox"
            className="qv-check"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          Mostrar canceladas
        </label>
        <span className="flex-1" />
        <span className="font-mono text-xs text-text-muted">{filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Nenhuma tarefa encontrada.</EmptyState>
      ) : (
        <ul className="qv-card overflow-hidden flex flex-col">
          {filtered.map((task) => {
            const due = task.due_date ? formatDueDate(task.due_date, task.status === "concluido" || task.is_cancelled) : null;
            return (
              <li key={task.id} className="qv-row flex items-center gap-4 px-[18px] py-[14px] flex-wrap">
                <div className="flex-1 min-w-[220px] flex flex-col gap-1.5">
                  <span
                    className={`text-sm font-medium ${
                      task.is_cancelled ? "line-through text-text-muted" : "text-text-primary"
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.priority !== "sem_prioridade" && (
                      <Badge tone={task.priority === "alta" ? "warning" : "neutral"}>{PRIORITY_LABEL[task.priority]}</Badge>
                    )}
                    {task.isBlocked && <Badge tone="warning">Bloqueada</Badge>}
                    {task.is_cancelled && <Badge tone="neutral">Cancelada</Badge>}
                    {task.tags.map((tag) => (
                      <Badge key={tag} tone="outline">
                        {tag}
                      </Badge>
                    ))}
                    {due && (
                      <span className={`font-mono text-[11px] ${due.className}`} title={task.due_date ?? undefined}>
                        {due.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {task.is_cancelled ? (
                    <Badge tone="outline">{STATUS_LABEL[task.status]}</Badge>
                  ) : (
                    <select
                      value={task.status}
                      onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
                      aria-label={`Status de "${task.title}"`}
                      className="qv-field w-auto py-[5px] px-2.5 text-xs rounded-[10px]"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button type="button" variant="quiet" size="xs" onClick={() => onToggleCancelled(task.id, !task.is_cancelled)}>
                    {task.is_cancelled ? "Reativar" : "Cancelar"}
                  </Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmDeleteId(task.id)}>
                    Excluir
                  </Button>
                </div>
              </li>
            );
          })}
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
