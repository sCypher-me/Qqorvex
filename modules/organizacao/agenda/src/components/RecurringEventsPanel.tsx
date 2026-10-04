import { useState, type FormEvent } from "react";
import { PauseIcon, PencilSimpleIcon, PlayIcon, RepeatIcon, XIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Notice, Select, SkeletonList, Switch, type BadgeTone, useToast } from "@qqorvex/ui";
import { useCreateRecurringEvent, useRecurringEvents, useUpdateRecurringEvent, useUpdateRecurringEventStatus } from "../hooks/useRecurringEvents";
import { localDateInputValue } from "../dateUtils";
import type { RecurringEvent, RecurringEventFrequency } from "../types";

const FREQUENCY_LABEL: Record<RecurringEventFrequency, string> = {
  diaria: "Todo dia",
  semanal: "Toda semana",
  mensal: "Todo mês",
};

const STATUS: Record<RecurringEvent["status"], { label: string; tone: BadgeTone }> = {
  ativa: { label: "Ativa", tone: "success" },
  pausada: { label: "Pausada", tone: "neutral" },
  cancelada: { label: "Encerrada", tone: "outline" },
};

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}

/** Eventos que se repetem: cada ocorrência vira um evento comum na data certa. */
export function RecurringEventsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { recurringEvents, isLoading, error } = useRecurringEvents(client);
  const createRecurring = useCreateRecurringEvent(client, userId);
  const updateStatus = useUpdateRecurringEventStatus(client);
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [frequency, setFrequency] = useState<RecurringEventFrequency>("semanal");
  const [startDate, setStartDate] = useState(() => localDateInputValue(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<RecurringEvent | null>(null);
  const updateRecurring = useUpdateRecurringEvent(client);
  const [editing, setEditing] = useState<RecurringEvent | null>(null);
  const today = localDateInputValue(new Date());

  function resetForm() {
    setEditing(null);
    setTitle("");
    setAllDay(false);
    setStartTime("09:00");
    setEndTime("10:00");
    setFrequency("semanal");
    setStartDate(localDateInputValue(new Date()));
    setFormError(null);
  }

  function startEditing(item: RecurringEvent) {
    setEditing(item);
    setTitle(item.title);
    setAllDay(item.is_all_day);
    setStartTime(item.start_time?.slice(0, 5) ?? "09:00");
    setEndTime(item.end_time?.slice(0, 5) ?? "10:00");
    setFrequency(item.frequency);
    setStartDate(item.next_occurrence_date);
    setFormError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    if (!allDay && endTime <= startTime) return setFormError("O término precisa ser depois do início.");
    setFormError(null);
    if (editing) {
      try {
        await updateRecurring.mutateAsync({
          current: editing,
          input: { title: clean, isAllDay: allDay, startTime: `${startTime}:00`, endTime: `${endTime}:00`, frequency, nextOccurrenceDate: startDate },
        });
        resetForm();
        toast({ title: "Repetição atualizada", description: "Vale a partir do próximo evento.", tone: "success" });
      } catch (caught) {
        setFormError(caught instanceof Error ? caught.message : "Não foi possível salvar. Tente novamente.");
      }
      return;
    }
    try {
      await createRecurring.mutateAsync({
        title: clean,
        isAllDay: allDay,
        startTime: allDay ? undefined : `${startTime}:00`,
        endTime: allDay ? undefined : `${endTime}:00`,
        frequency,
        startDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
      });
      setTitle("");
      toast({ title: "Repetição criada", description: `${clean} · ${FREQUENCY_LABEL[frequency].toLowerCase()}`, tone: "success" });
    } catch {
      setFormError("Não foi possível criar a repetição. Tente novamente.");
    }
  }

  const active = recurringEvents.filter((item) => item.status !== "cancelada");

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-canvas/50 p-4 sm:grid-cols-4">
        {editing && (
          <p className="flex items-center gap-2 text-xs text-fg-3 sm:col-span-4">
            <PencilSimpleIcon size={12} className="text-gold-fg" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              Editando <span className="font-medium text-fg">{editing.title}</span> — vale a partir do próximo evento
            </span>
          </p>
        )}
        <Input label="Evento que se repete" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Aula de inglês" maxLength={200} wrapperClassName="sm:col-span-4" />
        <Select label="Repetir" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringEventFrequency)}>
          {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label={editing ? "Próximo em" : "A partir de"}
          type="date"
          value={startDate}
          min={editing && editing.next_occurrence_date >= today ? today : undefined}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input label="Início" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} />
        <Input label="Término" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} />
        <label className="flex items-center gap-2.5 text-[13px] text-fg-2 sm:col-span-2">
          <Switch checked={allDay} onChange={setAllDay} size="sm" label="Dia inteiro" />
          Dia inteiro
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={createRecurring.isPending || updateRecurring.isPending} disabled={!title.trim()} leadingIcon={editing ? undefined : <RepeatIcon size={16} />}>
            {editing ? "Salvar alterações" : "Criar repetição"}
          </Button>
        </div>
        {formError && <Notice compact className="sm:col-span-4">{formError}</Notice>}
      </form>

      {error && <Notice title="Não foi possível carregar as repetições">Verifique a conexão e tente de novo.</Notice>}
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : active.length === 0 ? (
        <EmptyState size="sm" icon={<RepeatIcon />} title="Nenhum evento recorrente" description="Aulas, treinos e reuniões fixas aparecem sozinhos na agenda." />
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
                  {FREQUENCY_LABEL[item.frequency]} · {item.is_all_day ? "dia inteiro" : `${item.start_time?.slice(0, 5)}–${item.end_time?.slice(0, 5)}`} · próxima {formatDate(item.next_occurrence_date)}
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
      <ConfirmDialog
        isOpen={confirmCancel !== null}
        title="Encerrar esta repetição?"
        description={`“${confirmCancel?.title}” deixa de gerar novos eventos. Os já criados continuam na agenda.`}
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
