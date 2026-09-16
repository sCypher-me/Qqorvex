import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useCreateRecurringEvent, useRecurringEvents, useUpdateRecurringEventStatus } from "../hooks/useRecurringEvents";
import type { RecurringEventFrequency, RecurringEvent } from "../types";

const FREQUENCY_LABEL: Record<RecurringEventFrequency, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};

const RECURRING_STATUS_LABEL: Record<RecurringEvent["status"], string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const RECURRING_STATUS_TONE: Record<RecurringEvent["status"], BadgeTone> = {
  ativa: "success",
  pausada: "warning",
  cancelada: "error",
};

/**
 * A próxima ocorrência é gerada sozinha (cron em `send-notifications`, a cada 5 min) — sem botão
 * "Gerar agora" aqui de propósito, mesmo padrão de `RecurringTasksPanel`
 * (docs/decisions/eventos-recorrentes-design.md).
 */
export function RecurringEventsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { recurringEvents, isLoading } = useRecurringEvents(client);
  const createRecurring = useCreateRecurringEvent(client, userId);
  const updateStatus = useUpdateRecurringEventStatus(client);

  const [title, setTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [frequency, setFrequency] = useState<RecurringEventFrequency>("semanal");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const confirmRecurring = recurringEvents.find((r) => r.id === confirmCancelId) ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createRecurring.mutate({
      title: trimmed,
      isAllDay,
      startTime: isAllDay ? undefined : `${startTime}:00`,
      endTime: isAllDay ? undefined : `${endTime}:00`,
      frequency,
      startDate,
    });
    setTitle("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Eventos recorrentes</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : recurringEvents.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum evento recorrente cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recurringEvents.map((recurring) => (
            <li
              key={recurring.id}
              className="bg-surface-2 border border-border rounded-md p-3 flex items-center justify-between gap-2 text-sm text-text-primary"
            >
              <div className="flex flex-col gap-1">
                <p>{recurring.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge tone={RECURRING_STATUS_TONE[recurring.status]}>{RECURRING_STATUS_LABEL[recurring.status]}</Badge>
                  <span className="text-xs text-text-secondary-warm">
                    {FREQUENCY_LABEL[recurring.frequency]}
                    {!recurring.is_all_day && recurring.start_time ? ` às ${recurring.start_time.slice(0, 5)}` : " (dia inteiro)"} · próxima
                    em {recurring.next_occurrence_date}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recurring.status === "ativa" ? (
                  <Button type="button" variant="chip" onClick={() => updateStatus.mutate({ id: recurring.id, status: "pausada" })}>
                    Pausar
                  </Button>
                ) : recurring.status === "pausada" ? (
                  <Button type="button" variant="chip" onClick={() => updateStatus.mutate({ id: recurring.id, status: "ativa" })}>
                    Retomar
                  </Button>
                ) : null}
                {recurring.status !== "cancelada" && (
                  <Button type="button" variant="chip" onClick={() => setConfirmCancelId(recurring.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do evento recorrente"
          className="flex-1 min-w-[160px] rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <label className="flex items-center gap-1 text-sm text-text-secondary-warm">
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          Dia inteiro
        </label>
        {!isAllDay && (
          <>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
            />
          </>
        )}
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurringEventFrequency)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
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
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
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
