import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, EmptyState, Notice, SkeletonList, type BadgeTone } from "@qqorvex/ui";
import { useCreateRecurringTask, useRecurringTasks, useUpdateRecurringTaskStatus } from "../hooks/useTasks";
import type { TaskPriority, TaskRecurrenceFrequency, RecurringTask } from "../types";
import { localDateKey } from "../service";

const FREQUENCY_LABEL: Record<TaskRecurrenceFrequency, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

const RECURRING_STATUS_LABEL: Record<RecurringTask["status"], string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const RECURRING_STATUS_TONE: Record<RecurringTask["status"], BadgeTone> = {
  ativa: "info",
  pausada: "neutral",
  cancelada: "outline",
};

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * A ocorrência é sincronizada automaticamente ao criar/retomar a série e ao carregar o Kanban.
 * O cron em `send-notifications` continua cobrindo o app fechado — sem botão "Gerar agora".
 */
export function RecurringTasksPanel({ client, userId, onRetry }: { client: SupabaseClient<Database>; userId: string; onRetry?: () => void }) {
  const { recurringTasks, isLoading, error } = useRecurringTasks(client);
  const createRecurring = useCreateRecurringTask(client, userId);
  const updateStatus = useUpdateRecurringTaskStatus(client);

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<TaskRecurrenceFrequency>("diaria");
  const [startDate, setStartDate] = useState(() => localDateKey());
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("sem_prioridade");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const confirmRecurring = recurringTasks.find((r) => r.id === confirmCancelId) ?? null;

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createRecurring.mutate(
      { title: trimmed, description: description.trim() || undefined, priority, frequency, startDate },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setPriority("sem_prioridade");
          setFeedback({ tone: "success", message: "Recorrência criada e próxima ocorrência sincronizada." });
        },
        onError: () => setFeedback({ tone: "error", message: "Não foi possível criar a recorrência." }),
      },
    );
  }

  function changeStatus(id: string, status: "ativa" | "pausada") {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => setFeedback({ tone: "success", message: status === "ativa" ? "Recorrência retomada." : "Recorrência pausada." }),
        onError: () => setFeedback({ tone: "error", message: "Não foi possível atualizar a recorrência." }),
      },
    );
  }

  return (
    <div className="qv-card overflow-hidden flex flex-col">
      <div className="flex flex-wrap items-end gap-3 px-[18px] pb-3.5 pt-[18px]">
        <div className="min-w-0 flex-1">
          <p className="qv-eyebrow m-0 text-vex-cyan-bright">AUTOMAÇÃO</p>
          <span className="mt-1 block font-display text-base font-semibold">Tarefas recorrentes</span>
          <p className="m-0 mt-1 text-xs text-text-muted">Crie regras e deixe o painel gerar as próximas ocorrências automaticamente.</p>
        </div>
        {!isLoading && <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-text-muted">{recurringTasks.length}</span>}
      </div>

      {feedback && <Notice tone={feedback.tone} className="mx-[18px] mb-3 py-3">{feedback.message}</Notice>}

      {error && (
        <Notice
          tone="error"
          title="Não foi possível carregar as recorrências"
          className="mx-[18px] mb-3"
          actions={onRetry ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>Tentar novamente</Button> : undefined}
        >
          A criação de novas regras pode continuar indisponível até a conexão voltar.
        </Notice>
      )}

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : recurringTasks.length === 0 ? (
        <EmptyState className="px-[18px] pb-4">Nenhuma tarefa recorrente cadastrada.</EmptyState>
      ) : (
        <ul className="flex flex-col qv-row-top">
          {recurringTasks.map((recurring) => (
            <li key={recurring.id} className="qv-row flex items-center gap-4 px-[18px] py-[14px] flex-wrap">
              <div className="flex-1 min-w-[200px] flex flex-col gap-[3px]">
                <span className="text-sm font-medium text-text-primary">{recurring.title}</span>
                <span className="text-xs text-text-muted">
                  {FREQUENCY_LABEL[recurring.frequency]} · próxima em{" "}
                  <span className="font-mono text-text-secondary">{formatDate(recurring.next_occurrence_date)}</span>
                </span>
              </div>
              <Badge tone={RECURRING_STATUS_TONE[recurring.status]}>{RECURRING_STATUS_LABEL[recurring.status]}</Badge>
              <div className="flex items-center gap-1.5">
                {recurring.status === "ativa" ? (
                  <Button type="button" variant="quiet" size="xs" onClick={() => changeStatus(recurring.id, "pausada")} disabled={updateStatus.isPending}>
                    Pausar
                  </Button>
                ) : recurring.status === "pausada" ? (
                  <Button type="button" variant="quiet" size="xs" onClick={() => changeStatus(recurring.id, "ativa")} disabled={updateStatus.isPending}>
                    Retomar
                  </Button>
                ) : null}
                {recurring.status !== "cancelada" && (
                  <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmCancelId(recurring.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="qv-row-top flex flex-col gap-2.5 bg-surface-1/35 px-[18px] py-[14px]">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-text-muted">
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar planejamento semanal" aria-label="Título da tarefa recorrente" className="qv-field py-2.5" />
          </label>
          <label className="flex min-w-[130px] flex-col gap-1 text-xs text-text-muted">
            Repetição
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as TaskRecurrenceFrequency)} aria-label="Frequência" className="qv-field py-2.5">
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex min-w-[150px] flex-col gap-1 text-xs text-text-muted">
            Começa em
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Data de início" className="qv-field py-2.5 font-mono text-[13px]" />
          </label>
          <label className="flex min-w-[150px] flex-col gap-1 text-xs text-text-muted">
            Prioridade
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Prioridade da tarefa recorrente" className="qv-field py-2.5">
              <option value="sem_prioridade">Sem prioridade</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <Button type="submit" variant="primary" disabled={!title.trim() || createRecurring.isPending}>
            {createRecurring.isPending ? "Criando…" : "Criar regra"}
          </Button>
        </div>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Contexto opcional
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Instruções que serão copiadas para cada ocorrência" className="qv-field resize-y py-2.5 text-[13px]" />
        </label>
      </form>
      <ConfirmDialog
        isOpen={confirmRecurring !== null}
        title={`Cancelar "${confirmRecurring?.title}"?`}
        description="A recorrência para de gerar novas ocorrências."
        confirmLabel="Cancelar recorrência"
        onConfirm={() => {
          if (confirmRecurring) {
            updateStatus.mutate(
              { id: confirmRecurring.id, status: "cancelada" },
              {
                onSuccess: () => setFeedback({ tone: "success", message: "Recorrência cancelada." }),
                onError: () => setFeedback({ tone: "error", message: "Não foi possível cancelar a recorrência." }),
              },
            );
          }
          setConfirmCancelId(null);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
