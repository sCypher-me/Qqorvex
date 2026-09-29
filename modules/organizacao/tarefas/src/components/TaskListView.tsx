import { useMemo, useState } from "react";
import { Badge, Button, ConfirmDialog } from "@qqorvex/ui";
import type { TaskPriority, TaskStatus, TaskWithConditions } from "../types";
import { formatDueDate } from "./TaskCard";
import { localDateKey } from "../service";

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
const PRIORITY_ORDER: Record<TaskPriority, number> = { alta: 0, media: 1, baixa: 2, sem_prioridade: 3 };

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
  onOpenDetails,
}: {
  tasks: TaskWithConditions[];
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  onToggleCancelled: (taskId: string, isCancelled: boolean) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails?: (task: TaskWithConditions) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dueFilter, setDueFilter] = useState("");
  const [sortBy, setSortBy] = useState("prazo");
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.tags))).sort(), [tasks]);

  const today = localDateKey();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const nextWeek = localDateKey(weekAhead);
  const filtered = tasks
    .filter((t) => showCancelled || !t.is_cancelled)
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => !priorityFilter || t.priority === priorityFilter)
    .filter((t) => !tagFilter || t.tags.includes(tagFilter))
    .filter((t) => {
      if (dueFilter === "atrasadas") return t.isOverdue;
      if (dueFilter === "hoje") return t.due_date === today && t.status !== "concluido";
      if (dueFilter === "sem_prazo") return !t.due_date;
      if (dueFilter === "proximos_7_dias") return Boolean(t.due_date && t.status !== "concluido" && t.due_date >= today && t.due_date <= nextWeek);
      return true;
    })
    .filter((t) => {
      const needle = search.trim().toLocaleLowerCase("pt-BR");
      return !needle || t.title.toLocaleLowerCase("pt-BR").includes(needle) || (t.description ?? "").toLocaleLowerCase("pt-BR").includes(needle) || t.tags.some((tag) => tag.toLocaleLowerCase("pt-BR").includes(needle));
    })
    .sort((a, b) => {
      if (sortBy === "prioridade") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      if (sortBy === "recentes") return b.created_at.localeCompare(a.created_at);
      if (sortBy === "antigas") return a.created_at.localeCompare(b.created_at);
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

  const confirmTask = tasks.find((t) => t.id === confirmDeleteId) ?? null;
  const hasFilters = Boolean(statusFilter || priorityFilter || tagFilter || dueFilter || showCancelled || search);

  function clearFilters() {
    setStatusFilter("");
    setPriorityFilter("");
    setTagFilter("");
    setDueFilter("");
    setSearch("");
    setSortBy("prazo");
    setShowCancelled(false);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar tarefas" placeholder="Buscar tarefa, contexto ou tag" className="qv-field min-w-[220px] flex-[1_1_260px] py-2 px-3 text-[13px]" />
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
        <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} aria-label="Filtrar por prazo" className={FILTER_CLASS}>
          <option value="">Todos os prazos</option>
          <option value="atrasadas">Atrasadas</option>
          <option value="hoje">Vencem hoje</option>
          <option value="proximos_7_dias">Próximos 7 dias</option>
          <option value="sem_prazo">Sem prazo</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar tarefas" className={FILTER_CLASS}>
          <option value="prazo">Ordenar: prazo</option>
          <option value="prioridade">Ordenar: prioridade</option>
          <option value="recentes">Ordenar: mais recentes</option>
          <option value="antigas">Ordenar: mais antigas</option>
        </select>
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
        <span className="font-mono text-xs text-text-muted" aria-label={`${filtered.length} tarefas visíveis`}>
          {filtered.length} visíveis
        </span>
        {hasFilters && (
          <Button type="button" variant="quiet" size="xs" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="qv-card flex flex-col items-center gap-2.5 px-5 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2/55 font-mono text-text-muted" aria-hidden="true">⌕</span>
          <p className="m-0 text-sm font-medium text-text-primary">{hasFilters ? "Nenhuma tarefa combina com esses filtros." : "Você ainda não tem tarefas."}</p>
          <p className="m-0 max-w-[360px] text-xs leading-relaxed text-text-secondary">
            {hasFilters ? "Remova um filtro ou limpe a busca para ver outras tarefas." : "Capture sua primeira tarefa acima para começar a organizar seu fluxo."}
          </p>
          {hasFilters && <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
        </div>
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
                  {onOpenDetails && <Button type="button" variant="secondary" size="xs" onClick={() => onOpenDetails(task)}>Detalhes</Button>}
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
                        <option key={value} value={value} disabled={task.isBlocked && value !== "nao_iniciado" && value !== task.status}>
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
