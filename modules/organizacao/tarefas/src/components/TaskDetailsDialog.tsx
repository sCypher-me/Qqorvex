import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, Modal, Notice } from "@qqorvex/ui";
import {
  useAddDependency,
  useCreateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useRemoveDependency,
  useTaskChecklist,
  useTaskDependencies,
  useUpdateTaskChecklistItem,
} from "../hooks/useTasks";
import type { NewTaskInput, TaskPriority, TaskUpdateInput, TaskWithConditions } from "../types";

const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: "sem_prioridade", label: "Sem prioridade" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const FIELD = "qv-field w-full py-2.5 text-[13px]";

export function TaskDetailsDialog({
  isOpen,
  task,
  tasks,
  client,
  onClose,
  onCreate,
  onUpdate,
}: {
  isOpen: boolean;
  task: TaskWithConditions | null;
  tasks: TaskWithConditions[];
  client: SupabaseClient<Database>;
  onClose: () => void;
  onCreate: (input: NewTaskInput) => Promise<void>;
  onUpdate: (taskId: string, updates: TaskUpdateInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("sem_prioridade");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [tags, setTags] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [dependencyDraft, setDependencyDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const taskId = task?.id ?? null;
  const { items: checklist, isLoading: checklistLoading } = useTaskChecklist(client, taskId);
  const { dependencies, isLoading: dependenciesLoading } = useTaskDependencies(client);
  const createChecklist = useCreateTaskChecklistItem(client, taskId);
  const updateChecklist = useUpdateTaskChecklistItem(client, taskId);
  const deleteChecklist = useDeleteTaskChecklistItem(client, taskId);
  const addDependency = useAddDependency(client);
  const removeDependency = useRemoveDependency(client);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "sem_prioridade");
    setStartDate(task?.start_date ?? "");
    setDueDate(task?.due_date ?? "");
    setEstimatedMinutes(task?.estimated_minutes ? String(task.estimated_minutes) : "");
    setTags(task?.tags.join(", ") ?? "");
    setChecklistDraft("");
    setDependencyDraft("");
    setErrorMessage(null);
  }, [isOpen, task?.id]);

  const taskDependencies = useMemo(
    () => dependencies.filter((edge) => edge.task_id === taskId),
    [dependencies, taskId],
  );
  const prerequisites = taskDependencies
    .map((edge) => tasks.find((item) => item.id === edge.depends_on_task_id))
    .filter((item): item is TaskWithConditions => Boolean(item));
  const availablePrerequisites = tasks.filter(
    (candidate) => candidate.id !== taskId && candidate.status !== "concluido" &&
      !candidate.is_cancelled && !taskDependencies.some((edge) => edge.depends_on_task_id === candidate.id),
  );
  const completedItems = checklist.filter((item) => item.is_done).length;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    const parsedTags = [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))];
    const estimated = estimatedMinutes ? Number(estimatedMinutes) : undefined;
    try {
      if (task) {
        await onUpdate(task.id, {
          title: cleanTitle,
          description: description.trim() || null,
          priority,
          startDate: startDate || null,
          dueDate: dueDate || null,
          estimatedMinutes: estimated ?? null,
          tags: parsedTags,
        });
      } else {
        await onCreate({
          title: cleanTitle,
          description: description.trim() || undefined,
          priority,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          estimatedMinutes: estimated,
          tags: parsedTags,
        });
      }
      onClose();
    } catch {
      setErrorMessage("Não foi possível salvar. Seus dados continuam preenchidos; tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddChecklist(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = checklistDraft.trim();
    if (!taskId || !cleanTitle) return;
    setErrorMessage(null);
    try {
      await createChecklist.mutateAsync(cleanTitle);
      setChecklistDraft("");
    } catch {
      setErrorMessage("Não foi possível adicionar este passo à checklist.");
    }
  }

  async function handleAddDependency(event: FormEvent) {
    event.preventDefault();
    if (!taskId || !dependencyDraft) return;
    setErrorMessage(null);
    try {
      await addDependency.mutateAsync({ taskId, dependsOnTaskId: dependencyDraft });
      setDependencyDraft("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível vincular o pré-requisito.");
    }
  }

  async function handleChecklistToggle(itemId: string, isDone: boolean) {
    try {
      await updateChecklist.mutateAsync({ itemId, updates: { isDone } });
    } catch {
      setErrorMessage("Não foi possível atualizar este passo.");
    }
  }

  async function handleChecklistDelete(itemId: string) {
    try {
      await deleteChecklist.mutateAsync(itemId);
    } catch {
      setErrorMessage("Não foi possível remover este passo.");
    }
  }

  async function handleDependencyDelete(dependsOnTaskId: string) {
    if (!taskId) return;
    try {
      await removeDependency.mutateAsync({ taskId, dependsOnTaskId });
    } catch {
      setErrorMessage("Não foi possível remover este pré-requisito.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? "Detalhes da tarefa" : "Planejar tarefa"} size="lg">
      <div className="flex flex-col gap-5">
        <p className="m-0 max-w-[620px] text-[13px] leading-relaxed text-text-muted">
          Defina o resultado, o próximo passo e o tempo que cabe no seu dia. Você pode ajustar tudo depois.
        </p>

        {errorMessage && <Notice tone="error">{errorMessage}</Notice>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            O que precisa ser feito?
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required placeholder="Ex.: Preparar apresentação da semana" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Contexto e definição de concluído
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Adicione contexto, materiais ou como você saberá que terminou." className={`${FIELD} resize-y`} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Prioridade
              <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className={FIELD}>
                {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Esforço estimado (minutos)
              <input type="number" min="1" max="1440" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} placeholder="Ex.: 30" className={FIELD} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Começar em
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${FIELD} font-mono`} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Prazo
              <input type="date" value={dueDate} min={startDate || undefined} onChange={(event) => setDueDate(event.target.value)} className={`${FIELD} font-mono`} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Tags <span className="font-normal text-text-muted">Separe por vírgulas</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Trabalho, estudo, pessoal" className={FIELD} />
          </label>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || isSaving}>
              {isSaving ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
            </Button>
          </div>
        </form>

        {task && (
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-5 lg:grid-cols-2">
            <section className="qv-well flex flex-col gap-3 p-4" aria-labelledby="task-checklist-heading">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="task-checklist-heading" className="m-0 text-sm font-semibold text-text-primary">Próximos passos</h3>
                  <p className="m-0 mt-1 text-xs text-text-muted">{checklist.length ? `${completedItems} de ${checklist.length} concluídos` : "Quebre a tarefa em passos menores."}</p>
                </div>
                {checklist.length > 0 && <Badge tone={completedItems === checklist.length ? "success" : "neutral"}>{Math.round(completedItems / checklist.length * 100)}%</Badge>}
              </div>
              {checklistLoading ? <p className="m-0 text-xs text-text-muted">Carregando passos…</p> : checklist.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                      <input type="checkbox" className="qv-check" checked={item.is_done} aria-label={`Concluir ${item.title}`} onChange={(event) => handleChecklistToggle(item.id, event.target.checked)} />
                      <span className={`min-w-0 flex-1 text-[13px] ${item.is_done ? "text-text-muted line-through" : "text-text-primary"}`}>{item.title}</span>
                      <button type="button" className="text-xs text-text-muted hover:text-error" aria-label={`Remover ${item.title}`} onClick={() => handleChecklistDelete(item.id)}>×</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 text-xs text-text-muted">Sem passos adicionados.</p>}
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input value={checklistDraft} onChange={(event) => setChecklistDraft(event.target.value)} maxLength={140} placeholder="Adicionar um passo" aria-label="Novo passo da checklist" className={`${FIELD} min-w-0`} />
                <Button type="submit" variant="secondary" disabled={!checklistDraft.trim() || createChecklist.isPending}>Adicionar</Button>
              </form>
            </section>

            <section className="qv-well flex flex-col gap-3 p-4" aria-labelledby="task-prerequisites-heading">
              <div>
                <h3 id="task-prerequisites-heading" className="m-0 text-sm font-semibold text-text-primary">Pré-requisitos</h3>
                <p className="m-0 mt-1 text-xs leading-relaxed text-text-muted">Esta tarefa fica marcada como bloqueada até os pré-requisitos serem concluídos.</p>
              </div>
              {prerequisites.length ? (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {prerequisites.map((prerequisite) => (
                    <li key={prerequisite.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
                      <span className={`h-2 w-2 rounded-full ${prerequisite.status === "concluido" ? "bg-success" : "bg-warning"}`} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{prerequisite.title}</span>
                      <Badge tone={prerequisite.status === "concluido" ? "success" : "warning"}>{prerequisite.status === "concluido" ? "Feito" : "Pendente"}</Badge>
                      <button type="button" className="text-xs text-text-muted hover:text-error" aria-label={`Remover pré-requisito ${prerequisite.title}`} onClick={() => handleDependencyDelete(prerequisite.id)}>×</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 text-xs text-text-muted">{dependenciesLoading ? "Carregando pré-requisitos…" : "Nenhuma dependência vinculada."}</p>}
              {availablePrerequisites.length > 0 && (
                <form onSubmit={handleAddDependency} className="flex gap-2">
                  <select value={dependencyDraft} onChange={(event) => setDependencyDraft(event.target.value)} aria-label="Selecionar pré-requisito" className={`${FIELD} min-w-0`}>
                    <option value="">Selecionar tarefa anterior…</option>
                    {availablePrerequisites.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
                  </select>
                  <Button type="submit" variant="secondary" disabled={!dependencyDraft || addDependency.isPending}>Vincular</Button>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
}
