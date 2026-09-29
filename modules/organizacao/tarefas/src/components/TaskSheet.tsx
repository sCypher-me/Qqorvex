import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  HashIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  ProhibitIcon,
  TrashIcon,
  TreeStructureIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, IconButton, Notice, ProgressBar, Segmented, Sheet, Spinner, cx, useToast } from "@qqorvex/ui";
import {
  useAddDependency,
  useCreateTask,
  useCreateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useRemoveDependency,
  useTaskChecklist,
  useTaskDependencies,
  useUpdateTask,
  useUpdateTaskChecklistItem,
  useUpdateTaskStatus,
} from "../hooks/useTasks";
import { addDaysToKey, localDateKey } from "../service";
import type { TaskPriority, TaskStatus, TaskUpdateInput, TaskWithConditions } from "../types";
import { CompleteToggle, PRIORITY_META, STATUS_META } from "./TaskParts";

function PropertyRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid min-h-9 grid-cols-[132px_minmax(0,1fr)] items-center gap-3">
      <span className="flex items-center gap-2 text-[13px] text-fg-3 [&_svg]:size-4">
        {icon}
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const inlineField = "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] text-fg outline-none transition-colors hover:border-line hover:bg-field focus:border-gold-line focus:bg-field";

/**
 * Painel de detalhes da tarefa. Cada campo salva sozinho (ao sair do campo ou ao escolher uma
 * opção) — não existe "esquecer de salvar".
 */
export function TaskSheet({
  task,
  allTasks,
  client,
  userId,
  onClose,
  onDelete,
  onToggleCancelled,
}: {
  task: TaskWithConditions | null;
  allTasks: TaskWithConditions[];
  client: SupabaseClient<Database>;
  userId: string;
  onClose: () => void;
  onDelete: (task: TaskWithConditions) => void;
  onToggleCancelled: (task: TaskWithConditions) => void;
}) {
  const { toast } = useToast();
  const updateTask = useUpdateTask(client);
  const updateStatus = useUpdateTaskStatus(client);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setTagDraft("");
    setSaveState("idle");
    // Só reinicia ao trocar de tarefa — edições em andamento não são sobrescritas pelo refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [title, task?.id]);

  async function save(updates: TaskUpdateInput) {
    if (!task) return;
    setSaveState("saving");
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function changeStatus(status: TaskStatus) {
    if (!task || status === task.status) return;
    updateStatus.mutate(
      { taskId: task.id, status },
      { onError: (error) => toast({ title: "Não foi possível mudar o status", description: error instanceof Error ? error.message : undefined, tone: "danger" }) },
    );
  }

  function addTag(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    const clean = tagDraft.trim().replace(/^#/, "").toLowerCase();
    if (!clean || task.tags.includes(clean)) return setTagDraft("");
    void save({ tags: [...task.tags, clean] });
    setTagDraft("");
  }

  const subtasks = useMemo(() => allTasks.filter((item) => item.parent_task_id === task?.id), [allTasks, task?.id]);
  const parent = task?.parent_task_id ? allTasks.find((item) => item.id === task.parent_task_id) : null;
  const today = localDateKey();

  return (
    <Sheet
      isOpen={Boolean(task)}
      onClose={onClose}
      ariaLabel="Detalhes da tarefa"
      width={520}
      actions={
        <span className="mr-1 flex items-center gap-1.5 text-xs text-fg-4" aria-live="polite">
          {saveState === "saving" && (
            <>
              <Spinner size={12} /> Salvando…
            </>
          )}
          {saveState === "saved" && (
            <>
              <CheckCircleIcon size={13} className="text-success" /> Salvo
            </>
          )}
          {saveState === "error" && <span className="text-danger">Não salvou — tente de novo</span>}
        </span>
      }
      footer={
        task ? (
          <div className="flex w-full items-center gap-2">
            <span className="mr-auto text-2xs text-fg-4">Criada em {new Date(task.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
            <Button variant="ghost" size="sm" leadingIcon={<ProhibitIcon size={15} />} onClick={() => onToggleCancelled(task)}>
              {task.is_cancelled ? "Reativar" : "Cancelar"}
            </Button>
            <Button variant="danger" size="sm" leadingIcon={<TrashIcon size={15} />} onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
          </div>
        ) : undefined
      }
    >
      {task && (
        <div className="flex flex-col gap-5">
          {parent && <p className="text-xs text-fg-3">Subtarefa de <span className="font-medium text-fg-2">{parent.title}</span></p>}
          <div className="flex items-start gap-3">
            <span className="mt-1.5">
              <CompleteToggle done={task.status === "concluido"} size={20} label="Concluir tarefa" onToggle={() => changeStatus(task.status === "concluido" ? "nao_iniciado" : "concluido")} disabled={task.isBlocked && task.status !== "concluido"} />
            </span>
            <textarea
              ref={titleRef}
              value={title}
              rows={1}
              onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
              onBlur={() => {
                const clean = title.trim();
                if (clean && clean !== task.title) void save({ title: clean });
                else setTitle(task.title);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              aria-label="Título da tarefa"
              maxLength={300}
              className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent font-display text-[20px] font-semibold leading-snug text-fg outline-none"
            />
          </div>

          {task.isBlocked && task.status !== "concluido" && (
            <Notice tone="warning" compact>
              Esta tarefa está bloqueada até os pré-requisitos serem concluídos.
            </Notice>
          )}

          <div className="flex flex-col gap-0.5">
            <PropertyRow icon={<CheckCircleIcon />} label="Status">
              <Segmented
                size="sm"
                label="Status"
                options={(Object.keys(STATUS_META) as TaskStatus[]).map((status) => ({ value: status, label: STATUS_META[status].label }))}
                value={task.status}
                onChange={changeStatus}
              />
            </PropertyRow>
            <PropertyRow icon={<FlagIcon />} label="Prioridade">
              <select value={task.priority} onChange={(event) => void save({ priority: event.target.value as TaskPriority })} className={inlineField} aria-label="Prioridade">
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_META[priority].label}
                  </option>
                ))}
              </select>
            </PropertyRow>
            <PropertyRow icon={<CalendarBlankIcon />} label="Prazo">
              <div className="flex items-center gap-1">
                <input type="date" value={task.due_date ?? ""} min={task.start_date ?? undefined} onChange={(event) => void save({ dueDate: event.target.value || null })} className={cx(inlineField, "w-auto tabular-nums")} aria-label="Prazo" />
                {[
                  { label: "Hoje", value: today },
                  { label: "Amanhã", value: addDaysToKey(today, 1) },
                ].map((shortcut) => (
                  <button key={shortcut.label} type="button" onClick={() => void save({ dueDate: shortcut.value })} className={cx("rounded-md px-1.5 py-0.5 text-xs", task.due_date === shortcut.value ? "bg-gold-soft text-gold-fg" : "text-fg-4 hover:bg-hover hover:text-fg-2")}>
                    {shortcut.label}
                  </button>
                ))}
                {task.due_date && (
                  <IconButton size="xs" label="Remover prazo" onClick={() => void save({ dueDate: null })}>
                    <XIcon />
                  </IconButton>
                )}
              </div>
            </PropertyRow>
            <PropertyRow icon={<CalendarBlankIcon />} label="Começar em">
              <input type="date" value={task.start_date ?? ""} max={task.due_date ?? undefined} onChange={(event) => void save({ startDate: event.target.value || null })} className={cx(inlineField, "w-auto tabular-nums")} aria-label="Data de início" />
            </PropertyRow>
            <PropertyRow icon={<ClockIcon />} label="Estimativa">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={task.estimated_minutes ?? ""}
                  key={`${task.id}-${task.estimated_minutes}`}
                  onBlur={(event) => {
                    const value = event.target.value ? Number(event.target.value) : null;
                    if (value !== task.estimated_minutes) void save({ estimatedMinutes: value });
                  }}
                  placeholder="—"
                  className={cx(inlineField, "w-20 tabular-nums")}
                  aria-label="Estimativa em minutos"
                />
                <span className="text-xs text-fg-4">minutos</span>
              </div>
            </PropertyRow>
            <PropertyRow icon={<HashIcon />} label="Tags">
              <div className="flex flex-wrap items-center gap-1 px-1">
                {task.tags.map((tag) => (
                  <span key={tag} className="inline-flex h-6 items-center gap-1 rounded-md bg-hover pl-2 pr-1 text-xs text-fg-2">
                    {tag}
                    <button type="button" aria-label={`Remover tag ${tag}`} onClick={() => void save({ tags: task.tags.filter((item) => item !== tag) })} className="rounded p-0.5 text-fg-4 hover:text-fg">
                      <XIcon size={10} />
                    </button>
                  </span>
                ))}
                <form onSubmit={addTag} className="min-w-[96px] flex-1">
                  <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onBlur={(event) => tagDraft.trim() && addTag(event as unknown as FormEvent)} placeholder="Adicionar…" aria-label="Nova tag" className="h-7 w-full bg-transparent px-1 text-xs text-fg outline-none placeholder:text-fg-4" />
                </form>
              </div>
            </PropertyRow>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`task-description-${task.id}`} className="text-[13px] font-medium text-fg-2">
              Descrição
            </label>
            <textarea
              id={`task-description-${task.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => {
                const clean = description.trim();
                if (clean !== (task.description ?? "")) void save({ description: clean || null });
              }}
              rows={4}
              placeholder="Contexto, links, o que significa “pronto”…"
              className="q-input min-h-[96px]"
            />
          </div>

          <ChecklistSection client={client} taskId={task.id} />
          {!task.parent_task_id && <SubtasksSection client={client} userId={userId} task={task} subtasks={subtasks} />}
          <DependenciesSection client={client} task={task} allTasks={allTasks} />

          <ConfirmDialog
            isOpen={confirmDelete}
            title="Excluir tarefa?"
            description={`“${task.title}” será removida permanentemente${subtasks.length ? `, junto com ${subtasks.length} subtarefa(s)` : ""}.`}
            confirmLabel="Excluir"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false);
              onDelete(task);
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

function SectionHeader({ icon, title, meta }: { icon: ReactNode; title: string; meta?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 [&_svg]:size-4">
      <span className="text-fg-3">{icon}</span>
      <h3 className="text-[13px] font-semibold text-fg-2">{title}</h3>
      {meta && <span className="text-xs tabular-nums text-fg-4">{meta}</span>}
    </div>
  );
}

function ChecklistSection({ client, taskId }: { client: SupabaseClient<Database>; taskId: string }) {
  const { items } = useTaskChecklist(client, taskId);
  const create = useCreateTaskChecklistItem(client, taskId);
  const update = useUpdateTaskChecklistItem(client, taskId);
  const remove = useDeleteTaskChecklistItem(client, taskId);
  const [draft, setDraft] = useState("");
  const done = items.filter((item) => item.is_done).length;

  return (
    <section className="flex flex-col gap-2">
      <SectionHeader icon={<ListChecksIcon />} title="Checklist" meta={items.length ? `${done}/${items.length}` : undefined} />
      {items.length > 0 && <ProgressBar value={(done / items.length) * 100} tone="success" height={4} label="Progresso da checklist" />}
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-hover">
            <input type="checkbox" checked={item.is_done} onChange={(event) => update.mutate({ itemId: item.id, updates: { isDone: event.target.checked } })} aria-label={`Marcar ${item.title}`} className="h-4 w-4" />
            <span className={cx("min-w-0 flex-1 text-[13px]", item.is_done ? "text-fg-4 line-through" : "text-fg")}>{item.title}</span>
            <button type="button" onClick={() => remove.mutate(item.id)} aria-label={`Remover ${item.title}`} className="rounded p-1 text-fg-4 opacity-0 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100">
              <XIcon size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          create.mutate(draft.trim(), { onSuccess: () => setDraft("") });
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="+ Adicionar passo" aria-label="Novo passo" maxLength={140} className="h-8 w-full rounded-md bg-transparent px-1 text-[13px] text-fg outline-none placeholder:text-fg-4 focus:bg-hover" />
      </form>
    </section>
  );
}

function SubtasksSection({ client, userId, task, subtasks }: { client: SupabaseClient<Database>; userId: string; task: TaskWithConditions; subtasks: TaskWithConditions[] }) {
  const create = useCreateTask(client, userId);
  const updateStatus = useUpdateTaskStatus(client);
  const [draft, setDraft] = useState("");
  const done = subtasks.filter((item) => item.status === "concluido").length;
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader icon={<TreeStructureIcon />} title="Subtarefas" meta={subtasks.length ? `${done}/${subtasks.length}` : undefined} />
      <ul className="flex flex-col">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-hover">
            <CompleteToggle size={16} done={subtask.status === "concluido"} label={`Concluir ${subtask.title}`} onToggle={() => updateStatus.mutate({ taskId: subtask.id, status: subtask.status === "concluido" ? "nao_iniciado" : "concluido" })} />
            <span className={cx("min-w-0 flex-1 truncate text-[13px]", subtask.status === "concluido" ? "text-fg-4 line-through" : "text-fg")}>{subtask.title}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          create.mutate({ title: draft.trim(), parentTaskId: task.id, dueDate: task.due_date ?? undefined, tags: task.tags }, { onSuccess: () => setDraft("") });
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="+ Adicionar subtarefa" aria-label="Nova subtarefa" maxLength={300} className="h-8 w-full rounded-md bg-transparent px-1 text-[13px] text-fg outline-none placeholder:text-fg-4 focus:bg-hover" />
      </form>
    </section>
  );
}

function DependenciesSection({ client, task, allTasks }: { client: SupabaseClient<Database>; task: TaskWithConditions; allTasks: TaskWithConditions[] }) {
  const { dependencies } = useTaskDependencies(client);
  const add = useAddDependency(client);
  const remove = useRemoveDependency(client);
  const [error, setError] = useState<string | null>(null);
  const edges = dependencies.filter((edge) => edge.task_id === task.id);
  const prerequisites = edges.map((edge) => allTasks.find((item) => item.id === edge.depends_on_task_id)).filter((item): item is TaskWithConditions => Boolean(item));
  const candidates = allTasks.filter((candidate) => candidate.id !== task.id && candidate.status !== "concluido" && !candidate.is_cancelled && !candidate.parent_task_id && !edges.some((edge) => edge.depends_on_task_id === candidate.id));

  return (
    <section className="flex flex-col gap-2">
      <SectionHeader icon={<LinkSimpleIcon />} title="Depende de" meta={prerequisites.length || undefined} />
      {prerequisites.length > 0 && (
        <ul className="flex flex-col">
          {prerequisites.map((item) => (
            <li key={item.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-hover">
              <span className={cx("h-2 w-2 rounded-full", item.status === "concluido" ? "bg-success" : "bg-warning")} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{item.title}</span>
              <span className="text-2xs text-fg-4">{item.status === "concluido" ? "Concluída" : "Pendente"}</span>
              <button type="button" onClick={() => remove.mutate({ taskId: task.id, dependsOnTaskId: item.id })} aria-label={`Remover dependência ${item.title}`} className="rounded p-1 text-fg-4 opacity-0 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100">
                <XIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {candidates.length > 0 && (
        <select
          value=""
          onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            setError(null);
            add.mutate({ taskId: task.id, dependsOnTaskId: value }, { onError: (caught) => setError(caught instanceof Error ? caught.message : "Não foi possível vincular.") });
          }}
          aria-label="Adicionar pré-requisito"
          className={cx(inlineField, "text-fg-3")}
        >
          <option value="">+ Adicionar pré-requisito…</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}
