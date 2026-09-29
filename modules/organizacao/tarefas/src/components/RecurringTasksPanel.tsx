import { useState, type FormEvent } from "react";
import { PauseIcon, PencilSimpleIcon, PlayIcon, RepeatIcon, XIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Notice, Select, SkeletonList, type BadgeTone, useToast } from "@qqorvex/ui";
import { useCreateRecurringTask, useRecurringTasks, useUpdateRecurringTask, useUpdateRecurringTaskStatus } from "../hooks/useTasks";
import type { TaskPriority, TaskRecurrenceFrequency, RecurringTask } from "../types";
import { formatDueLabel, localDateKey } from "../service";

const FREQUENCY_LABEL: Record<TaskRecurrenceFrequency, string> = {
  diaria: "Todo dia",
  semanal: "Toda semana",
  mensal: "Todo mês",
};

const STATUS: Record<RecurringTask["status"], { label: string; tone: BadgeTone }> = {
  ativa: { label: "Ativa", tone: "success" },
  pausada: { label: "Pausada", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "outline" },
};

/**
 * Regras de repetição: cada regra gera uma tarefa comum na data certa (a série em si nunca é
 * uma tarefa). A geração roda ao abrir as tarefas e também pelo servidor com o app fechado.
 */
export function RecurringTasksPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { recurringTasks, isLoading, error } = useRecurringTasks(client);
  const createRecurring = useCreateRecurringTask(client, userId);
  const updateStatus = useUpdateRecurringTaskStatus(client);
  const updateRecurring = useUpdateRecurringTask(client);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<TaskRecurrenceFrequency>("semanal");
  const [startDate, setStartDate] = useState(() => localDateKey());
  const [priority, setPriority] = useState<TaskPriority>("sem_prioridade");
  const [confirmCancel, setConfirmCancel] = useState<RecurringTask | null>(null);
  const [editing, setEditing] = useState<RecurringTask | null>(null);
  const today = localDateKey();

  function resetForm() {
    setEditing(null);
    setTitle("");
    setFrequency("semanal");
    setStartDate(localDateKey());
    setPriority("sem_prioridade");
  }

  function startEditing(item: RecurringTask) {
    setEditing(item);
    setTitle(item.title);
    setFrequency(item.frequency);
    setStartDate(item.next_occurrence_date);
    setPriority(item.priority);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    if (editing) {
      updateRecurring.mutate(
        { current: editing, input: { title: clean, priority, frequency, nextOccurrenceDate: startDate } },
        {
          onSuccess: () => {
            resetForm();
            toast({ title: "Repetição atualizada", description: "Vale a partir da próxima tarefa.", tone: "success" });
          },
          onError: (caught) => toast({ title: "Não foi possível salvar", description: caught instanceof Error ? caught.message : undefined, tone: "danger" }),
        },
      );
      return;
    }
    createRecurring.mutate(
      { title: clean, priority, frequency, startDate },
      {
        onSuccess: () => {
          setTitle("");
          toast({ title: "Repetição criada", description: `${clean} · ${FREQUENCY_LABEL[frequency].toLowerCase()}`, tone: "success" });
        },
        onError: () => toast({ title: "Não foi possível criar a repetição", tone: "danger" }),
      },
    );
  }

  const active = recurringTasks.filter((item) => item.status !== "cancelada");
  const cancelled = recurringTasks.filter((item) => item.status === "cancelada");

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-canvas/50 p-4 sm:grid-cols-[minmax(0,1fr)_150px] ">
        {editing && (
          <p className="flex items-center gap-2 text-xs text-fg-3 sm:col-span-2">
            <PencilSimpleIcon size={12} className="text-gold-fg" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              Editando <span className="font-medium text-fg">{editing.title}</span> — vale a partir da próxima tarefa
            </span>
          </p>
        )}
        <Input label="Tarefa que se repete" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Revisar planejamento da semana" maxLength={300} wrapperClassName="sm:col-span-2" />
        <Select label="Repetir" value={frequency} onChange={(event) => setFrequency(event.target.value as TaskRecurrenceFrequency)}>
          {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label={editing ? "Próxima em" : "A partir de"}
          type="date"
          value={startDate}
          min={editing && editing.next_occurrence_date >= today ? today : undefined}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Select label="Prioridade" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
          <option value="sem_prioridade">Sem prioridade</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </Select>
        <div className="flex items-end gap-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          )}
          <Button type="submit" fullWidth loading={createRecurring.isPending || updateRecurring.isPending} disabled={!title.trim()} leadingIcon={editing ? undefined : <RepeatIcon size={16} />}>
            {editing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>

      {error && <Notice title="Não foi possível carregar as repetições">Verifique sua conexão e tente novamente.</Notice>}

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : active.length === 0 ? (
        <EmptyState size="sm" icon={<RepeatIcon />} title="Nenhuma repetição ativa" description="Rotinas como “pagar contas” ou “revisão semanal” aparecem sozinhas na sua lista no dia certo." />
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line">
          {active.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-3">
                <RepeatIcon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-fg">{item.title}</p>
                <p className="text-xs text-fg-3">
                  {FREQUENCY_LABEL[item.frequency]} · próxima: <span className="tabular-nums text-fg-2">{formatDueLabel(item.next_occurrence_date)}</span>
                </p>
              </div>
              <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
              <IconButton label="Editar repetição" size="sm" active={editing?.id === item.id} onClick={() => startEditing(item)}>
                <PencilSimpleIcon />
              </IconButton>
              {item.status === "ativa" ? (
                <IconButton label="Pausar" size="sm" onClick={() => updateStatus.mutate({ id: item.id, status: "pausada" })}>
                  <PauseIcon />
                </IconButton>
              ) : (
                <IconButton label="Retomar" size="sm" onClick={() => updateStatus.mutate({ id: item.id, status: "ativa" })}>
                  <PlayIcon />
                </IconButton>
              )}
              <IconButton label="Encerrar repetição" size="sm" variant="danger" onClick={() => setConfirmCancel(item)}>
                <XIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {cancelled.length > 0 && <p className="text-xs text-fg-4">{cancelled.length} repetição(ões) encerrada(s) não aparecem aqui.</p>}

      <ConfirmDialog
        isOpen={confirmCancel !== null}
        title="Encerrar esta repetição?"
        description={`“${confirmCancel?.title}” não vai gerar novas tarefas. As tarefas já criadas continuam na sua lista.`}
        confirmLabel="Encerrar"
        onCancel={() => setConfirmCancel(null)}
        onConfirm={() => {
          if (confirmCancel && editing?.id === confirmCancel.id) resetForm();
          if (confirmCancel) updateStatus.mutate({ id: confirmCancel.id, status: "cancelada" });
          setConfirmCancel(null);
        }}
      />
    </div>
  );
}
