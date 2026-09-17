import { useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import type { CalendarEvent, NewEventInput } from "../types";
import { formatShortDate } from "./EventStyle";

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
    <form onSubmit={handleSubmit} className="qv-card p-3.5 flex flex-col gap-2.5">
      <div className="flex gap-2.5 flex-wrap">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Novo evento — ex: Reunião com o time"
          aria-label="Título do evento"
          className="qv-field flex-1 basis-[240px]"
        />
        <div className="qv-well flex items-center gap-2 px-3.5 py-0 min-h-[44px] font-mono text-[13px] text-text-secondary">
          <span className="whitespace-nowrap">{formatShortDate(selectedDate)}</span>
          {isAllDay ? (
            <span className="whitespace-nowrap">· dia inteiro</span>
          ) : (
            <>
              <span aria-hidden>·</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="Início"
                className="bg-transparent border-0 outline-none font-mono text-[13px] text-text-primary w-[82px]"
              />
              <span aria-hidden>–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="Fim"
                className="bg-transparent border-0 outline-none font-mono text-[13px] text-text-primary w-[82px]"
              />
            </>
          )}
        </div>
        <Button type="submit" variant="primary" className="px-5">
          Criar
        </Button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap text-[13px] text-text-secondary">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Categoria"
          className="qv-field w-auto py-2 text-[13px]"
        >
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={reminderMinutes}
          onChange={(e) => setReminderMinutes(e.target.value)}
          aria-label="Lembrete"
          className="qv-field w-auto py-2 text-[13px]"
        >
          {REMINDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="qv-check" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          Dia inteiro
        </label>
        {category === "reuniao" && (
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Link da reunião (opcional)"
            aria-label="Link da reunião"
            className="qv-field flex-1 basis-[220px] py-2 text-[13px]"
          />
        )}
      </div>

      {conflicts && conflicts.length > 0 && (
        <Notice
          tone="warning"
          title="Horário ocupado"
          actions={
            <>
              <Button type="button" variant="secondary" size="sm" onClick={confirmAnyway}>
                Criar mesmo assim
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Escolher outro horário
              </Button>
            </>
          }
        >
          Conflita com: {conflicts.map((c) => c.title).join(", ")}
        </Notice>
      )}
    </form>
  );
}
