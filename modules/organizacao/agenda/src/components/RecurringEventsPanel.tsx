import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, CardHeader, ConfirmDialog, EmptyState, type BadgeTone } from "@qqorvex/ui";
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

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

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
    <div className="flex flex-col gap-[18px]">
      <form onSubmit={handleSubmit} className="qv-card p-3.5 flex flex-col gap-2.5">
        <div className="flex gap-2.5 flex-wrap">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Novo evento recorrente — título"
            aria-label="Título do evento recorrente"
            className="qv-field flex-1 basis-[240px]"
          />
          <Button type="submit" variant="primary" className="px-5">
            Criar
          </Button>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap text-[13px] text-text-secondary">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringEventFrequency)}
            aria-label="Frequência"
            className="qv-field w-auto py-2 text-[13px]"
          >
            {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <span>A partir de</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="qv-field w-auto py-2 font-mono text-[13px]"
            />
          </label>
          {!isAllDay && (
            <span className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="Início"
                className="qv-field w-auto py-2 font-mono text-[13px]"
              />
              <span aria-hidden>–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="Fim"
                className="qv-field w-auto py-2 font-mono text-[13px]"
              />
            </span>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="qv-check" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
            Dia inteiro
          </label>
        </div>
      </form>

      <div className="qv-card">
        <CardHeader
          divider
          title="Eventos recorrentes"
          meta={isLoading ? undefined : `${recurringEvents.length} ${recurringEvents.length === 1 ? "receita" : "receitas"}`}
        />
        {isLoading ? (
          <EmptyState className="px-5 py-4">Carregando...</EmptyState>
        ) : recurringEvents.length === 0 ? (
          <EmptyState className="px-5 py-4">Nenhum evento recorrente cadastrado.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {recurringEvents.map((recurring) => (
              <li key={recurring.id} className="qv-row flex items-center gap-3.5 px-5 py-3.5 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-medium text-text-primary truncate">{recurring.title}</span>
                  <span className="text-xs text-text-muted">
                    {FREQUENCY_LABEL[recurring.frequency]}
                    {!recurring.is_all_day && recurring.start_time ? (
                      <>
                        {" às "}
                        <span className="font-mono">{recurring.start_time.slice(0, 5)}</span>
                      </>
                    ) : (
                      " · dia inteiro"
                    )}
                    {" · próxima em "}
                    <span className="font-mono">{formatDate(recurring.next_occurrence_date)}</span>
                  </span>
                </div>
                <Badge tone={RECURRING_STATUS_TONE[recurring.status]}>{RECURRING_STATUS_LABEL[recurring.status]}</Badge>
                <div className="flex items-center gap-2">
                  {recurring.status === "ativa" ? (
                    <Button
                      type="button"
                      variant="quiet"
                      size="xs"
                      onClick={() => updateStatus.mutate({ id: recurring.id, status: "pausada" })}
                    >
                      Pausar
                    </Button>
                  ) : recurring.status === "pausada" ? (
                    <Button
                      type="button"
                      variant="quiet"
                      size="xs"
                      onClick={() => updateStatus.mutate({ id: recurring.id, status: "ativa" })}
                    >
                      Retomar
                    </Button>
                  ) : null}
                  {recurring.status !== "cancelada" && (
                    <Button type="button" variant="quiet" size="xs" onClick={() => setConfirmCancelId(recurring.id)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
