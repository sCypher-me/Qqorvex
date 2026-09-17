import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, EmptyState, type BadgeTone } from "@qqorvex/ui";
import { useCreateRecurringTask, useRecurringTasks, useUpdateRecurringTaskStatus } from "../hooks/useTasks";
import type { TaskRecurrenceFrequency, RecurringTask } from "../types";

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
 * A próxima ocorrência é gerada sozinha (cron em `send-notifications`, a cada 5 min) — sem botão
 * "Gerar agora" aqui de propósito (docs/decisions/tarefas-recorrentes-design.md).
 */
export function RecurringTasksPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { recurringTasks, isLoading } = useRecurringTasks(client);
  const createRecurring = useCreateRecurringTask(client, userId);
  const updateStatus = useUpdateRecurringTaskStatus(client);

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<TaskRecurrenceFrequency>("diaria");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const confirmRecurring = recurringTasks.find((r) => r.id === confirmCancelId) ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createRecurring.mutate({ title: trimmed, frequency, startDate });
    setTitle("");
  }

  return (
    <div className="qv-card overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-[18px] pt-[18px] pb-3.5">
        <span className="font-display text-base font-semibold">Tarefas recorrentes</span>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{recurringTasks.length}</span>}
      </div>

      {isLoading ? (
        <EmptyState className="px-[18px] pb-4">Carregando...</EmptyState>
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
                  <Button type="button" variant="quiet" size="xs" onClick={() => updateStatus.mutate({ id: recurring.id, status: "pausada" })}>
                    Pausar
                  </Button>
                ) : recurring.status === "pausada" ? (
                  <Button type="button" variant="quiet" size="xs" onClick={() => updateStatus.mutate({ id: recurring.id, status: "ativa" })}>
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

      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap items-center gap-2.5 px-[18px] py-[14px]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da tarefa recorrente"
          aria-label="Título da tarefa recorrente"
          className="qv-field flex-1 min-w-[200px] py-2.5"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as TaskRecurrenceFrequency)}
          aria-label="Frequência"
          className="qv-field w-auto py-2.5"
        >
          {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="Data de início"
          className="qv-field w-auto py-2.5 font-mono text-[13px]"
        />
        <Button type="submit" variant="primary">
          Criar
        </Button>
      </form>
      <ConfirmDialog
        isOpen={confirmRecurring !== null}
        title={`Cancelar "${confirmRecurring?.title}"?`}
        description="A recorrência para de gerar novas ocorrências."
        confirmLabel="Cancelar recorrência"
        onConfirm={() => {
          if (confirmRecurring) updateStatus.mutate({ id: confirmRecurring.id, status: "cancelada" });
          setConfirmCancelId(null);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
