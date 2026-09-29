import { useEffect, useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import type { CalendarEvent, NewEventInput } from "../types";
import { formatShortDate } from "./EventStyle";
import { EventConflictError } from "../service";
import { localDateTimeToIso } from "../dateUtils";

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
  isCreating = false,
}: {
  selectedDate: Date;
  checkConflicts: (input: NewEventInput) => CalendarEvent[];
  onCreate: (input: NewEventInput, ignoreConflicts?: boolean) => Promise<void> | void;
  isCreating?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState("compromisso");
  const [meetingLink, setMeetingLink] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("");
  const [conflicts, setConflicts] = useState<CalendarEvent[] | null>(null);
  const [pendingInput, setPendingInput] = useState<NewEventInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConflicts(null);
    setPendingInput(null);
  }, [selectedDate]);

  function clearConflictState() {
    setConflicts(null);
    setPendingInput(null);
  }

  function buildInput(): NewEventInput | null {
    const trimmed = title.trim();
    if (!trimmed) return null;

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const startAt = localDateTimeToIso(dateStr, isAllDay ? "00:00" : startTime);
    const endAt = localDateTimeToIso(dateStr, isAllDay ? "23:59" : endTime, isAllDay ? 59 : 0);

    return {
      title: trimmed,
      isAllDay,
      startAt,
      endAt,
      category,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      meetingLink: category === "reuniao" && meetingLink.trim() ? meetingLink.trim() : undefined,
      reminderMinutesBefore: reminderMinutes ? Number(reminderMinutes) : undefined,
    };
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    clearConflictState();
    setError(null);
    if (endTime <= value) {
      const [hours, minutes] = value.split(":").map(Number);
      const adjustedMinutes = Math.min((hours ?? 0) * 60 + (minutes ?? 0) + 60, 23 * 60 + 59);
      setEndTime(`${String(Math.floor(adjustedMinutes / 60)).padStart(2, "0")}:${String(adjustedMinutes % 60).padStart(2, "0")}`);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Dê um título ao evento para continuar.");
      return;
    }
    if (!isAllDay && (!startTime || !endTime || endTime <= startTime)) {
      setError("O horário final precisa ser depois do horário inicial.");
      return;
    }

    let input: NewEventInput | null;
    try {
      input = buildInput();
    } catch {
      setError("Não foi possível interpretar a data e o horário. Revise os campos e tente novamente.");
      return;
    }
    if (!input) return;

    const foundConflicts = checkConflicts(input);
    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setPendingInput(input);
      return;
    }

    void submitInput(input);
  }

  async function submitInput(input: NewEventInput, ignoreConflicts = false) {
    setError(null);
    try {
      await onCreate(input, ignoreConflicts);
      reset();
    } catch (createError) {
      if (!ignoreConflicts && createError instanceof EventConflictError) {
        setConflicts(createError.conflicts);
        setPendingInput(input);
        return;
      }
      setError(createError instanceof Error ? createError.message : "Não foi possível criar o evento.");
    }
  }

  function confirmAnyway() {
    if (!pendingInput) return;
    void submitInput(pendingInput, true);
  }

  function reset() {
    setTitle("");
    setMeetingLink("");
    setDescription("");
    setLocation("");
    setShowDetails(false);
    setConflicts(null);
    setPendingInput(null);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="qv-card editorial-agenda-capture p-3.5 flex flex-col gap-2.5">
      <div className="editorial-agenda-capture-main gap-2.5">
        <input
          id="agenda-quick-event-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); clearConflictState(); setError(null); }}
          placeholder="Novo evento — ex: Reunião com o time"
          aria-label="Título do evento"
          className="qv-field editorial-agenda-capture-title flex-1 basis-[240px]"
        />
        <div className="qv-well editorial-agenda-capture-date flex items-center gap-2 px-3.5 py-0 min-h-[44px] font-mono text-[13px] text-text-secondary">
          <span className="whitespace-nowrap">{formatShortDate(selectedDate)}</span>
          {isAllDay ? (
            <span className="whitespace-nowrap">· dia inteiro</span>
          ) : (
            <>
              <span aria-hidden>·</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                aria-label="Início"
                className="bg-transparent border-0 outline-none font-mono text-[13px] text-text-primary w-[82px]"
              />
              <span aria-hidden>–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); clearConflictState(); setError(null); }}
                aria-label="Fim"
                className="bg-transparent border-0 outline-none font-mono text-[13px] text-text-primary w-[82px]"
              />
            </>
          )}
        </div>
        <Button type="submit" variant="primary" className="editorial-agenda-capture-submit px-5" disabled={isCreating}>
          {isCreating ? "Criando…" : "Criar"}
        </Button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap text-[13px] text-text-secondary">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); clearConflictState(); }}
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
          onChange={(e) => { setReminderMinutes(e.target.value); clearConflictState(); }}
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
          <input type="checkbox" className="qv-check" checked={isAllDay} onChange={(e) => { setIsAllDay(e.target.checked); clearConflictState(); }} />
          Dia inteiro
        </label>
        {category === "reuniao" && (
          <input
            value={meetingLink}
            onChange={(e) => { setMeetingLink(e.target.value); clearConflictState(); }}
            placeholder="Link da reunião (opcional)"
            aria-label="Link da reunião"
            className="qv-field flex-1 basis-[220px] py-2 text-[13px]"
          />
        )}
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? "Ocultar detalhes" : "Mais detalhes"}
        </button>
      </div>

      {showDetails && (
        <div className="grid gap-2.5 border-t border-border/70 pt-2.5 sm:grid-cols-2">
          <input value={location} onChange={(e) => { setLocation(e.target.value); clearConflictState(); }} placeholder="Local (opcional)" aria-label="Local" className="qv-field py-2 text-[13px]" />
          {category !== "reuniao" && <input value={meetingLink} onChange={(e) => { setMeetingLink(e.target.value); clearConflictState(); }} placeholder="Link da reunião (opcional)" aria-label="Link da reunião" className="qv-field py-2 text-[13px]" />}
          <textarea value={description} onChange={(e) => { setDescription(e.target.value); clearConflictState(); }} placeholder="Descrição (opcional)" aria-label="Descrição" className="qv-field min-h-16 resize-y py-2 text-[13px] sm:col-span-2" />
        </div>
      )}

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
      {error && <Notice tone="error" title="Não foi possível criar o evento">{error}</Notice>}
    </form>
  );
}
