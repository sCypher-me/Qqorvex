import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, CardHeader, ConfirmDialog, EmptyState, Notice, SkeletonList, type BadgeTone } from "@qqorvex/ui";
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

function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A próxima ocorrência é gerada sozinha (cron em `send-notifications`, a cada 5 min) — sem botão
 * "Gerar agora" aqui de propósito, mesmo padrão de `RecurringTasksPanel`
 * (docs/decisions/eventos-recorrentes-design.md).
 */
export function RecurringEventsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { recurringEvents, isLoading, error, refetch } = useRecurringEvents(client);
  const createRecurring = useCreateRecurringEvent(client, userId);
  const updateStatus = useUpdateRecurringEventStatus(client);

  const [title, setTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [frequency, setFrequency] = useState<RecurringEventFrequency>("semanal");
  const [startDate, setStartDate] = useState(() => localDateInputValue(new Date()));
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const confirmRecurring = recurringEvents.find((r) => r.id === confirmCancelId) ?? null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!isAllDay && endTime <= startTime) {
      setFeedback("O horário final precisa ser depois do horário inicial.");
      return;
    }
    try {
      await createRecurring.mutateAsync({
        title: trimmed,
        isAllDay,
        startTime: isAllDay ? undefined : `${startTime}:00`,
        endTime: isAllDay ? undefined : `${endTime}:00`,
        frequency,
        startDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      });
      setTitle("");
      setFeedback("Regra recorrente criada. A próxima ocorrência aparecerá na Agenda automaticamente.");
    } catch {
      setFeedback("Não foi possível criar a regra recorrente. Tente novamente.");
    }
  }

  async function changeStatus(id: string, status: RecurringEvent["status"], successMessage: string) {
    try {
      await updateStatus.mutateAsync({ id, status });
      setFeedback(successMessage);
    } catch {
      setFeedback("Não foi possível atualizar esta regra. Tente novamente.");
    }
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
          <Button type="submit" variant="primary" className="px-5" disabled={createRecurring.isPending}>
            {createRecurring.isPending ? "Criando…" : "Criar regra"}
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

      {feedback && <Notice tone={feedback.startsWith("Não") || feedback.startsWith("O horário") ? "error" : "success"} title={feedback.startsWith("Não") || feedback.startsWith("O horário") ? "Verifique os dados" : "Tudo certo"}>{feedback}</Notice>}
      {error && (
        <Notice tone="error" title="Não foi possível carregar as recorrências" actions={<Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}>
          A Agenda continua disponível, mas as regras recorrentes não puderam ser atualizadas.
        </Notice>
      )}

      <div className="qv-card">
        <CardHeader
          divider
          title="Regras recorrentes"
          meta={isLoading ? undefined : `${recurringEvents.length} ${recurringEvents.length === 1 ? "regra" : "regras"}`}
        />
        {isLoading ? (
          <SkeletonList rows={3} className="px-5 py-3.5" />
        ) : recurringEvents.length === 0 ? (
          <EmptyState className="px-5 py-4">Nenhuma regra cadastrada. Crie uma para gerar eventos automaticamente.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {recurringEvents.map((recurring) => (
              <li key={recurring.id} className="qv-row flex items-center gap-3.5 px-5 py-3.5 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-medium text-text-primary truncate">{recurring.title}</span>
                  <span className="text-xs text-text-muted">
                    {FREQUENCY_LABEL[recurring.frequency]}
                    {" · "}{recurring.time_zone || "America/Sao_Paulo"}
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
                      onClick={() => void changeStatus(recurring.id, "pausada", "Regra pausada. Nenhuma nova ocorrência será criada até você retomá-la.")}
                      disabled={updateStatus.isPending}
                    >
                      Pausar
                    </Button>
                  ) : recurring.status === "pausada" ? (
                    <Button
                      type="button"
                      variant="quiet"
                      size="xs"
                      onClick={() => void changeStatus(recurring.id, "ativa", "Regra retomada e pronta para gerar novas ocorrências.")}
                      disabled={updateStatus.isPending}
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
          if (confirmRecurring) void changeStatus(confirmRecurring.id, "cancelada", "Regra cancelada. Ela não criará novas ocorrências.");
          setConfirmCancelId(null);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
