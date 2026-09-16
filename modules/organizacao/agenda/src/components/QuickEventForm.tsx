import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import type { CalendarEvent, NewEventInput } from "../types";

const CATEGORY_LABEL: Record<string, string> = {
  compromisso: "Compromisso",
  reuniao: "Reunião",
  prazo: "Prazo",
  pessoal: "Pessoal",
};

const REMINDER_OPTIONS = [
  { value: "", label: "Sem lembrete" },
  { value: "5", label: "5 min antes" },
  { value: "15", label: "15 min antes" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
];

/**
 * "Criação rápida deve aceitar somente o necessário e permitir completar os detalhes depois."
 * "Antes de criar/editar, o sistema deve identificar sobreposição relevante" — checkConflicts
 * roda antes de persistir; se houver conflito, exige confirmação explícita ("Criar mesmo assim").
 * Categoria "Reunião" libera o campo de link — é a mesma captura rápida, não um formulário à
 * parte, então a Reunião também passa pela checagem de conflito.
 */
export function QuickEventForm({
  selectedDate,
  checkConflicts,
  onCreate,
}: {
  selectedDate: Date;
  checkConflicts: (input: NewEventInput) => CalendarEvent[];
  onCreate: (input: NewEventInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState("compromisso");
  const [meetingLink, setMeetingLink] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("");
  const [conflicts, setConflicts] = useState<CalendarEvent[] | null>(null);
  const [pendingInput, setPendingInput] = useState<NewEventInput | null>(null);

  function buildInput(): NewEventInput | null {
    const trimmed = title.trim();
    if (!trimmed) return null;

    const dateStr = selectedDate.toISOString().slice(0, 10);
    const startAt = isAllDay ? `${dateStr}T00:00:00` : `${dateStr}T${startTime}:00`;
    const endAt = isAllDay ? `${dateStr}T23:59:59` : `${dateStr}T${endTime}:00`;

    return {
      title: trimmed,
      isAllDay,
      startAt,
      endAt,
      category,
      meetingLink: category === "reuniao" && meetingLink.trim() ? meetingLink.trim() : undefined,
      reminderMinutesBefore: reminderMinutes ? Number(reminderMinutes) : undefined,
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const input = buildInput();
    if (!input) return;

    const foundConflicts = checkConflicts(input);
    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setPendingInput(input);
      return;
    }

    onCreate(input);
    reset();
  }

  function confirmAnyway() {
    if (!pendingInput) return;
    onCreate(pendingInput);
    reset();
  }

  function reset() {
    setTitle("");
    setMeetingLink("");
    setConflicts(null);
    setPendingInput(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do evento"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
        >
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary">
          Adicionar
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm text-text-primary">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          Dia inteiro
        </label>
        {!isAllDay && (
          <>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary"
            />
            <span>até</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary"
            />
          </>
        )}
      </div>

      {category === "reuniao" && (
        <input
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="Link da reunião (opcional)"
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
      )}

      <select
        value={reminderMinutes}
        onChange={(e) => setReminderMinutes(e.target.value)}
        className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm w-fit"
      >
        {REMINDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {conflicts && conflicts.length > 0 && (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex flex-col gap-2">
          <p className="text-sm text-warning">
            Conflita com: {conflicts.map((c) => c.title).join(", ")}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={confirmAnyway}>
              Criar mesmo assim
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Escolher outro horário
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
