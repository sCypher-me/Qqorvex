import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarCheckIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  ColumnsIcon,
  HashIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  RepeatIcon,
  SunIcon,
  TrayIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { billingLimitMessage } from "@qqorvex/database";
import {
  RecurringTasksPanel,
  SmartAdd,
  TaskBoard,
  TaskList,
  TaskSheet,
  addDaysToKey,
  localDateKey,
  useAllTasks,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTaskCancelled,
  useUpdateTaskStatus,
  type NewTaskInput,
  type TaskGrouping,
  type TaskRowActions,
  type TaskStatus,
  type TaskWithConditions,
} from "@qqorvex/module-tarefas";
import { Button, ConfirmDialog, EmptyState, Modal, Notice, PageContainer, PageHeader, Segmented, Select, SkeletonList, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { useQuickCreate } from "../app/shell/QuickCreate";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";

type SmartList = "abertas" | "hoje" | "semana" | "atrasadas" | "sem_prazo" | "concluidas" | "canceladas";
type ViewMode = "lista" | "quadro";

const SMART_LISTS: Array<{ key: SmartList; label: string; icon: ReactNode }> = [
  { key: "abertas", label: "Todas", icon: <TrayIcon /> },
  { key: "hoje", label: "Hoje", icon: <SunIcon /> },
  { key: "semana", label: "Próximos 7 dias", icon: <CalendarDotsIcon /> },
  { key: "atrasadas", label: "Atrasadas", icon: <WarningCircleIcon /> },
  { key: "sem_prazo", label: "Sem prazo", icon: <CalendarCheckIcon /> },
  { key: "concluidas", label: "Concluídas", icon: <CheckCircleIcon /> },
  { key: "canceladas", label: "Canceladas", icon: <ProhibitIcon /> },
];

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* opcional */
  }
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function TarefasPage() {
  const { userId } = useAccount();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quickCreate = useQuickCreate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCurrentItem } = useCurrentItem();
  const addInputRef = useRef<HTMLInputElement>(null);

  const [list, setList] = useState<SmartList>(() => readPref("qqorvex.tasks.list", SMART_LISTS.map((item) => item.key), "abertas"));
  const [view, setView] = useState<ViewMode>(() => readPref("qqorvex.tasks.view", ["lista", "quadro"] as const, "lista"));
  const [grouping, setGrouping] = useState<TaskGrouping>(() => readPref("qqorvex.tasks.grouping", ["prazo", "prioridade", "nenhum"] as const, "prazo"));
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TaskWithConditions | null>(null);
  const selectedId = searchParams.get("tarefa");

  const { tasks, isLoading, error } = useTasks(supabase, userId);
  const { tasks: allTasks } = useAllTasks(supabase);
  const createTask = useCreateTask(supabase, userId);
  const updateStatus = useUpdateTaskStatus(supabase);
  const updateCancelled = useUpdateTaskCancelled(supabase);
  const deleteTask = useDeleteTask(supabase);

  useEffect(() => writePref("qqorvex.tasks.list", list), [list]);
  useEffect(() => writePref("qqorvex.tasks.view", view), [view]);
  useEffect(() => writePref("qqorvex.tasks.grouping", grouping), [grouping]);

  // Links antigos ("capturar tarefa") levam o foco para a adição rápida.
  useEffect(() => {
    if (!(location.state as { focusCapture?: boolean } | null)?.focusCapture) return;
    addInputRef.current?.focus();
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);

  const today = localDateKey();
  const weekEnd = addDaysToKey(today, 7);
  const open = tasks.filter((task) => task.status !== "concluido");

  const counts: Record<SmartList, number> = {
    abertas: open.length,
    hoje: open.filter((task) => (task.due_date !== null && task.due_date <= today) || task.status === "em_andamento").length,
    semana: open.filter((task) => task.due_date !== null && task.due_date <= weekEnd).length,
    atrasadas: open.filter((task) => task.isOverdue).length,
    sem_prazo: open.filter((task) => !task.due_date).length,
    concluidas: tasks.filter((task) => task.status === "concluido").length,
    canceladas: allTasks.filter((task) => task.is_cancelled && !task.parent_task_id).length,
  };

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of open) for (const item of task.tags) map.set(item, (map.get(item) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const visible = useMemo(() => {
    let base: TaskWithConditions[];
    switch (list) {
      case "hoje":
        base = tasks.filter((task) => (task.status !== "concluido" && ((task.due_date !== null && task.due_date <= today) || task.status === "em_andamento")) || (task.status === "concluido" && task.completed_at?.slice(0, 10) === today));
        break;
      case "semana":
        base = tasks.filter((task) => task.due_date !== null && task.due_date <= weekEnd && (task.status !== "concluido" || task.completed_at?.slice(0, 10) === today));
        break;
      case "atrasadas":
        base = open.filter((task) => task.isOverdue);
        break;
      case "sem_prazo":
        base = tasks.filter((task) => !task.due_date);
        break;
      case "concluidas":
        base = tasks.filter((task) => task.status === "concluido").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
        break;
      case "canceladas":
        base = allTasks.filter((task) => task.is_cancelled && !task.parent_task_id);
        break;
      default:
        base = tasks;
    }
    if (tag) base = base.filter((task) => task.tags.includes(tag));
    const term = normalize(query.trim());
    if (term) base = base.filter((task) => normalize(`${task.title} ${task.description ?? ""} ${task.tags.join(" ")}`).includes(term));
    return base;
  }, [allTasks, list, open, query, tag, tasks, today, weekEnd]);

  const subtaskCounts = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const task of allTasks) {
      if (!task.parent_task_id || task.is_cancelled) continue;
      const entry = map.get(task.parent_task_id) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (task.status === "concluido") entry.done += 1;
      map.set(task.parent_task_id, entry);
    }
    return map;
  }, [allTasks]);

  const selectedTask = selectedId ? allTasks.find((task) => task.id === selectedId) ?? tasks.find((task) => task.id === selectedId) ?? null : null;

  function openTask(task: TaskWithConditions) {
    setCurrentItem({ type: "tarefa", id: task.id, label: task.title });
    const next = new URLSearchParams(searchParams);
    next.set("tarefa", task.id);
    setSearchParams(next, { replace: false });
  }

  function closeTask() {
    const next = new URLSearchParams(searchParams);
    next.delete("tarefa");
    setSearchParams(next, { replace: true });
  }

  function changeStatus(task: TaskWithConditions, status: TaskStatus) {
    const previous = task.status;
    updateStatus.mutate(
      { taskId: task.id, status },
      {
        onSuccess: () => {
          if (status === "concluido") {
            toast({ title: "Tarefa concluída", description: task.title, tone: "success", action: { label: "Desfazer", onClick: () => updateStatus.mutate({ taskId: task.id, status: previous }) } });
          }
        },
        onError: (caught) => toast({ title: "Não foi possível atualizar", description: caught instanceof Error ? caught.message : undefined, tone: "danger" }),
      },
    );
  }

  const actions: TaskRowActions = {
    onOpen: openTask,
    onToggleComplete: (task) => changeStatus(task, task.status === "concluido" ? "nao_iniciado" : "concluido"),
    onChangeStatus: changeStatus,
    onToggleCancelled: (task) =>
      updateCancelled.mutate(
        { taskId: task.id, isCancelled: !task.is_cancelled },
        { onSuccess: () => toast({ title: task.is_cancelled ? "Tarefa reativada" : "Tarefa cancelada", description: task.title }) },
      ),
    onDelete: (task) => setConfirmDelete(task),
  };

  async function handleCreate(input: NewTaskInput) {
    try {
      await createTask.mutateAsync(input);
    } catch (caught) {
      toast({ title: "Não foi possível criar a tarefa", description: billingLimitMessage(caught) ?? "Seu texto foi mantido para tentar de novo.", tone: "danger" });
      throw caught;
    }
  }

  const addDefaults: Partial<NewTaskInput> = {
    ...(list === "hoje" ? { dueDate: today } : {}),
    ...(tag ? { tags: [tag] } : {}),
  };

  const activeList = SMART_LISTS.find((item) => item.key === list)!;
  const summaryParts = [
    `${counts.abertas} ${counts.abertas === 1 ? "aberta" : "abertas"}`,
    counts.hoje ? `${counts.hoje} para hoje` : null,
    counts.atrasadas ? `${counts.atrasadas} ${counts.atrasadas === 1 ? "atrasada" : "atrasadas"}` : null,
  ].filter(Boolean);

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Tarefas"
        description={isLoading ? "Carregando…" : summaryParts.join(" · ")}
        actions={
          <>
            <Segmented
              label="Modo de visualização"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "lista", label: "Lista", icon: <ListBulletsIcon /> },
                { value: "quadro", label: "Quadro", icon: <ColumnsIcon /> },
              ]}
            />
            <Button variant="secondary" size="sm" leadingIcon={<RepeatIcon size={15} />} onClick={() => setRecurringOpen(true)}>
              Repetições
            </Button>
            <Button size="sm" onClick={() => quickCreate.open("task", addDefaults.dueDate ? { date: addDefaults.dueDate } : undefined)}>
              Nova tarefa
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside aria-label="Listas" className="min-w-0">
          <nav className="q-scroll-x -mx-4 flex gap-1 px-4 lg:mx-0 lg:flex-col lg:px-0">
            {SMART_LISTS.map((item) => {
              const active = item.key === list;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setList(item.key)}
                  aria-current={active ? "true" : undefined}
                  className={cx(
                    "flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors [&_svg]:size-4",
                    active ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
                  )}
                >
                  <span className={cx(active ? "text-gold-fg" : item.key === "atrasadas" && counts.atrasadas ? "text-danger" : "text-fg-4")}>{item.icon}</span>
                  <span className="lg:flex-1 lg:text-left">{item.label}</span>
                  {counts[item.key] > 0 && <span className={cx("text-xs tabular-nums", item.key === "atrasadas" ? "text-danger" : "text-fg-4")}>{counts[item.key]}</span>}
                </button>
              );
            })}
          </nav>
          {tags.length > 0 && (
            <div className="mt-6 hidden lg:block">
              <p className="mb-1.5 px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-4">Tags</p>
              <div className="flex flex-col gap-0.5">
                {tags.slice(0, 12).map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTag(tag === name ? null : name)}
                    aria-pressed={tag === name}
                    className={cx("flex h-7 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors", tag === name ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg")}
                  >
                    <HashIcon size={13} className="text-fg-4" />
                    <span className="flex-1 truncate text-left">{name}</span>
                    <span className="text-xs tabular-nums text-fg-4">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="flex min-w-0 flex-col gap-4" aria-label={activeList.label}>
          <SmartAdd onCreate={handleCreate} inputRef={addInputRef} defaults={addDefaults} placeholder={list === "hoje" ? "Adicionar para hoje — ex.: Ligar para o banco !alta" : undefined} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-[280px]">
              <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar tarefas" aria-label="Filtrar tarefas" data-size="sm" className="q-input pl-8!" />
            </div>
            {tag && (
              <button type="button" onClick={() => setTag(null)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gold-soft px-2.5 text-xs font-medium text-gold-fg">
                #{tag} <XIcon size={12} />
              </button>
            )}
            {view === "lista" && list !== "concluidas" && list !== "canceladas" && (
              <Select fieldSize="sm" value={grouping} onChange={(event) => setGrouping(event.target.value as TaskGrouping)} aria-label="Agrupar por" wrapperClassName="ml-auto" className="w-auto">
                <option value="prazo">Agrupar por prazo</option>
                <option value="prioridade">Agrupar por prioridade</option>
                <option value="nenhum">Sem agrupamento</option>
              </Select>
            )}
          </div>

          {error ? (
            <Notice
              title="Não foi possível carregar suas tarefas"
              actions={
                <Button size="sm" variant="secondary" onClick={() => void queryClient.invalidateQueries({ queryKey: ["tasks"] })}>
                  Tentar novamente
                </Button>
              }
            >
              Nada foi perdido — elas continuam salvas. Verifique a conexão.
            </Notice>
          ) : isLoading ? (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <SkeletonList rows={6} meta leading />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line">
              <EmptyState
                icon={query || tag ? <MagnifyingGlassIcon /> : list === "atrasadas" ? <CheckCircleIcon /> : activeList.icon}
                title={query || tag ? "Nenhuma tarefa encontrada" : list === "atrasadas" ? "Nada atrasado" : list === "hoje" ? "Seu dia está livre" : list === "concluidas" ? "Nada concluído ainda" : "Nenhuma tarefa aqui"}
                description={query || tag ? "Tente outro termo ou limpe os filtros." : list === "atrasadas" ? "Tudo em dia. Bom trabalho!" : "Use o campo acima para adicionar — datas como “amanhã” ou “sexta” são entendidas automaticamente."}
                action={
                  query || tag ? (
                    <Button variant="secondary" size="sm" onClick={() => { setQuery(""); setTag(null); }}>
                      Limpar filtros
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : view === "quadro" ? (
            <TaskBoard tasks={visible} actions={actions} onAdd={() => addInputRef.current?.focus()} metaFor={(task) => subtaskLabel(subtaskCounts.get(task.id))} />
          ) : (
            <TaskList tasks={visible} actions={actions} grouping={list === "concluidas" || list === "canceladas" ? "nenhum" : grouping} selectedId={selectedId} metaFor={(task) => subtaskLabel(subtaskCounts.get(task.id))} />
          )}
        </section>
      </div>

      <TaskSheet
        task={selectedTask}
        allTasks={allTasks}
        client={supabase}
        userId={userId}
        onClose={closeTask}
        onToggleCancelled={(task) => actions.onToggleCancelled?.(task)}
        onDelete={(task) => {
          closeTask();
          deleteTask.mutate(task.id, { onSuccess: () => toast({ title: "Tarefa excluída", description: task.title }) });
        }}
      />

      <Modal isOpen={recurringOpen} onClose={() => setRecurringOpen(false)} title="Tarefas que se repetem" description="Cada repetição cria uma tarefa comum na data certa." size="lg" icon={<RepeatIcon />}>
        <RecurringTasksPanel client={supabase} userId={userId} />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Excluir tarefa?"
        description={`“${confirmDelete?.title}” será removida permanentemente.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const task = confirmDelete;
          setConfirmDelete(null);
          if (task) deleteTask.mutate(task.id, { onSuccess: () => toast({ title: "Tarefa excluída", description: task.title }) });
        }}
      />
    </PageContainer>
  );
}

function subtaskLabel(entry: { done: number; total: number } | undefined): string | undefined {
  return entry ? `${entry.done}/${entry.total} subtarefas` : undefined;
}
