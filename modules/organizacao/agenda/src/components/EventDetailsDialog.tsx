import { useEffect, useState, type FormEvent } from "react";
import { Button, ConfirmDialog, Modal, Notice } from "@qqorvex/ui";
import type { CalendarEvent, NewEventInput } from "../types";
import { EventConflictError } from "../service";
import { localDateTimeToIso } from "../dateUtils";

const CATEGORY_LABEL: Record<string, string> = {
  compromisso: "Compromisso",
  reuniao: "Reunião",
  prazo: "Prazo",
  pessoal: "Pessoal",
};

function localDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toIso(date: string, time: string, endOfDay = false): string {
  return localDateTimeToIso(date, endOfDay ? "23:59" : time, endOfDay ? 59 : 0);
}

export function EventDetailsDialog({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (eventId: string, input: NewEventInput, ignoreConflicts?: boolean) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState("compromisso");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [conflicts, setConflicts] = useState<CalendarEvent[] | null>(null);
  const [pendingInput, setPendingInput] = useState<NewEventInput | null>(null);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDate(localDate(event.start_at));
    setStartTime(localTime(event.start_at));
    setEndTime(localTime(event.end_at));
    setIsAllDay(event.is_all_day);
    setCategory(event.category ?? "compromisso");
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");
    setMeetingLink(event.meeting_link ?? "");
    setEditing(false);
    setError(null);
    setConfirmDelete(false);
    setConflicts(null);
    setPendingInput(null);
  }, [event]);

  async function saveInput(input: NewEventInput, ignoreConflicts = false) {
    if (!event) return;
    setError(null);
    setIsSaving(true);
    try {
      await onSave(event.id, input, ignoreConflicts);
      setConflicts(null);
      setPendingInput(null);
      onClose();
    } catch (saveError) {
      if (!ignoreConflicts && saveError instanceof EventConflictError) {
        setConflicts(saveError.conflicts);
        setPendingInput(input);
        return;
      }
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o evento.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event) return;
    const trimmed = title.trim();
    if (!trimmed || !date) {
      setError("Informe um título e uma data.");
      return;
    }
    if (!isAllDay && endTime <= startTime) {
      setError("O horário final precisa ser depois do horário inicial.");
      return;
    }
    const input: NewEventInput = {
      title: trimmed,
      startAt: toIso(date, startTime, isAllDay),
      endAt: toIso(date, endTime, isAllDay),
      isAllDay,
      category,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
    };
    setConflicts(null);
    setPendingInput(null);
    void saveInput(input);
  }

  async function confirmDeleteEvent() {
    if (!event) return;
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      setConfirmDelete(false);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o evento.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Modal isOpen={event !== null} onClose={onClose} title={editing ? "Editar evento" : event?.title ?? "Detalhes do evento"} size="md">
        {event && !editing ? (
          <div className="flex flex-col gap-4">
            <div className="qv-well flex flex-col gap-1.5">
              <span className="qv-eyebrow">{CATEGORY_LABEL[event.category] ?? event.category ?? "Evento"}</span>
              <span className="text-sm text-text-primary">
                {event.is_all_day ? "Dia inteiro" : `${new Date(event.start_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })} – ${new Date(event.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </div>
            {event.description && <p className="m-0 text-sm leading-relaxed text-text-secondary">{event.description}</p>}
            <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
              {event.location && <span>Local: {event.location}</span>}
              {event.meeting_link && (
                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-vex-cyan-bright hover:underline">
                  Abrir link da reunião
                </a>
              )}
            </div>
            {error && <Notice tone="error" title="Não foi possível concluir a ação">{error}</Notice>}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                Excluir evento
              </Button>
              <Button type="button" variant="primary" onClick={() => setEditing(true)}>
                Editar evento
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input value={title} onChange={(e) => { setTitle(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field" aria-label="Título do evento" autoFocus />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs text-text-muted">
                Data
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field font-mono text-[13px]" />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm text-text-secondary">
                <input type="checkbox" className="qv-check" checked={isAllDay} onChange={(e) => { setIsAllDay(e.target.checked); setConflicts(null); setPendingInput(null); }} />
                Dia inteiro
              </label>
            </div>
            {!isAllDay && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs text-text-muted">
                  Início
                  <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field font-mono text-[13px]" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-text-muted">
                  Fim
                  <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field font-mono text-[13px]" />
                </label>
              </div>
            )}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <select value={category} onChange={(e) => { setCategory(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field" aria-label="Categoria">
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={location} onChange={(e) => { setLocation(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field" placeholder="Local (opcional)" aria-label="Local" />
            </div>
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field min-h-20 resize-y" placeholder="Descrição (opcional)" aria-label="Descrição" />
            <input value={meetingLink} onChange={(e) => { setMeetingLink(e.target.value); setConflicts(null); setPendingInput(null); }} className="qv-field" placeholder="Link da reunião (opcional)" aria-label="Link da reunião" />
            {conflicts && pendingInput && (
              <Notice
                tone="warning"
                title="Este horário já está ocupado"
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={() => void saveInput(pendingInput, true)}>
                      Salvar mesmo assim
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setConflicts(null); setPendingInput(null); }}>
                      Ajustar horário
                    </Button>
                  </div>
                }
              >
                Conflita com: {conflicts.map((conflict) => conflict.title).join(", ")}.
              </Notice>
            )}
            {error && <Notice tone="error" title="Não foi possível salvar">{error}</Notice>}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? "Salvando…" : "Salvar alterações"}</Button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Excluir "${event?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={confirmDeleteEvent}
        onCancel={() => setConfirmDelete(false)}
      />
      {isDeleting && <span className="sr-only" role="status">Excluindo evento…</span>}
    </>
  );
}
