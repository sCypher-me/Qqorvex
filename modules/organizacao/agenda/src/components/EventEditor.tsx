import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  ClockIcon,
  CopyIcon,
  MapPinIcon,
  PencilSimpleIcon,
  TextAlignLeftIcon,
  TrashIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { Button, ConfirmDialog, ExternalButtonLink, Input, Modal, Notice, Select, Switch, Textarea } from "@qqorvex/ui";
import { EVENT_CATEGORIES, eventCategory } from "../calendar";
import { localDateInputValue, localDateTimeToIso } from "../dateUtils";
import { EventConflictError } from "../service";
import type { CalendarEvent, NewEventInput } from "../types";
import { formatEventTime } from "./CalendarViews";

const REMINDERS = [
  { value: "", label: "Sem lembrete" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
];

function timeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export interface EventDraft {
  start: Date;
  end: Date;
  title?: string;
  allDay?: boolean;
}

export interface EventSubmitOptions {
  ignoreConflicts: boolean;
  createZoom: boolean;
}

/** Criar/editar evento. Conflitos de horário pedem confirmação explícita antes de salvar. */
export function EventEditor({
  isOpen,
  event,
  draft,
  zoomAvailable = true,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  /** Evento existente (edição) ou `null` (criação a partir de `draft`). */
  event: CalendarEvent | null;
  draft: EventDraft | null;
  zoomAvailable?: boolean;
  onClose: () => void;
  onSubmit: (input: NewEventInput, options: EventSubmitOptions) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState("compromisso");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState("15");
  const [createZoom, setCreateZoom] = useState(false);
  const [conflicts, setConflicts] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const startDate = event ? new Date(event.start_at) : draft?.start ?? new Date();
    const endDate = event ? new Date(event.end_at) : draft?.end ?? new Date(startDate.getTime() + 3_600_000);
    setTitle(event?.title ?? draft?.title ?? "");
    setDate(localDateInputValue(startDate));
    setStart(timeValue(startDate));
    setEnd(timeValue(endDate));
    setAllDay(event?.is_all_day ?? draft?.allDay ?? false);
    setCategory(event ? eventCategory(event.category).key || "compromisso" : "compromisso");
    setLocation(event?.location ?? "");
    setMeetingLink(event?.meeting_link ?? "");
    setDescription(event?.description ?? "");
    setReminder(event ? "" : "15");
    setCreateZoom(false);
    setConflicts(null);
    setError(null);
    setSaving(false);
  }, [isOpen, event, draft]);

  function buildInput(): NewEventInput | null {
    if (!title.trim()) {
      setError("Dê um nome para o evento.");
      return null;
    }
    if (!allDay && end <= start) {
      setError("O término precisa ser depois do início.");
      return null;
    }
    try {
      return {
        title: title.trim(),
        isAllDay: allDay,
        startAt: localDateTimeToIso(date, allDay ? "00:00" : start),
        endAt: localDateTimeToIso(date, allDay ? "23:59" : end, allDay ? 59 : 0),
        category,
        location: location.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        description: description.trim() || undefined,
        reminderMinutesBefore: !event && reminder ? Number(reminder) : undefined,
      };
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data ou horário inválidos.");
      return null;
    }
  }

  async function submit(ignoreConflicts: boolean) {
    const input = buildInput();
    if (!input) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(input, { ignoreConflicts, createZoom });
      onClose();
    } catch (caught) {
      if (caught instanceof EventConflictError) setConflicts(caught.conflicts);
      else setError(caught instanceof Error ? caught.message : "Não foi possível salvar o evento.");
    } finally {
      setSaving(false);
    }
  }

  function onFormSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    void submit(false);
  }

  const selectedCategory = eventCategory(category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? "Editar evento" : "Novo evento"}
      size="md"
      icon={<CalendarBlankIcon />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="event-editor-form" loading={saving}>
            {event ? "Salvar" : "Criar evento"}
          </Button>
        </>
      }
    >
      <form id="event-editor-form" onSubmit={onFormSubmit} className="flex flex-col gap-4">
        <Input label="Nome" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reunião de planejamento" maxLength={200} autoFocus data-autofocus />
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
          <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Início" type="time" value={start} step={300} onChange={(e) => setStart(e.target.value)} disabled={allDay} />
          <Input label="Término" type="time" value={end} step={300} onChange={(e) => setEnd(e.target.value)} disabled={allDay} />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
            <Switch checked={allDay} onChange={setAllDay} size="sm" label="Dia inteiro" />
            Dia inteiro
          </label>
          {!event && zoomAvailable && (
            <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Switch checked={createZoom} onChange={setCreateZoom} size="sm" label="Gerar reunião no Zoom" />
              Gerar reunião no Zoom
            </label>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Categoria" value={selectedCategory.key} onChange={(e) => setCategory(e.target.value)}>
            {EVENT_CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
            {!EVENT_CATEGORIES.some((item) => item.key === selectedCategory.key) && <option value={selectedCategory.key}>{selectedCategory.label}</option>}
          </Select>
          {!event ? (
            <Select label="Lembrete" value={reminder} onChange={(e) => setReminder(e.target.value)}>
              {REMINDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input label="Local" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço ou sala" leadingIcon={<MapPinIcon />} />
          )}
        </div>
        {!event && <Input label="Local" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço ou sala" leadingIcon={<MapPinIcon />} />}
        {!createZoom && <Input label="Link da reunião" type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://" leadingIcon={<VideoCameraIcon />} />}
        <Textarea label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Pauta, observações, o que levar…" />
        {error && <Notice compact>{error}</Notice>}
        {conflicts && (
          <Notice
            tone="warning"
            title="Esse horário já está ocupado"
            actions={
              <Button size="sm" variant="secondary" onClick={() => void submit(true)} loading={saving}>
                Salvar mesmo assim
              </Button>
            }
          >
            Conflita com: {conflicts.map((item) => `${item.title} (${formatEventTime(item)})`).join(", ")}.
          </Notice>
        )}
      </form>
    </Modal>
  );
}

/** Detalhes de um evento, com ações rápidas (entrar na reunião, editar, duplicar, excluir). */
export function EventDetails({
  event,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!event) return null;
  const category = eventCategory(event.category);
  const start = new Date(event.start_at);

  return (
    <>
      <Modal
        isOpen={Boolean(event)}
        onClose={onClose}
        title={event.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" leadingIcon={<TrashIcon size={15} />} onClick={() => setConfirmDelete(true)} className="mr-auto text-danger hover:text-danger">
              Excluir
            </Button>
            <Button variant="ghost" size="sm" leadingIcon={<CopyIcon size={15} />} onClick={() => onDuplicate(event)}>
              Duplicar
            </Button>
            <Button variant="secondary" size="sm" leadingIcon={<PencilSimpleIcon size={15} />} onClick={() => onEdit(event)}>
              Editar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-[13.5px]">
          <p className="flex items-center gap-2.5 text-fg-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: category.color }} />
            {category.label}
          </p>
          <p className="flex items-start gap-2.5 text-fg">
            <ClockIcon size={17} className="mt-0.5 shrink-0 text-fg-3" />
            <span>
              <span className="capitalize">{start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
              <span className="block text-fg-3">{formatEventTime(event)}</span>
            </span>
          </p>
          {event.location && (
            <p className="flex items-start gap-2.5 text-fg">
              <MapPinIcon size={17} className="mt-0.5 shrink-0 text-fg-3" />
              {event.location}
            </p>
          )}
          {event.description && (
            <p className="flex items-start gap-2.5 whitespace-pre-wrap text-fg-2">
              <TextAlignLeftIcon size={17} className="mt-0.5 shrink-0 text-fg-3" />
              {event.description}
            </p>
          )}
          {event.meeting_link && (
            <ExternalButtonLink href={event.meeting_link} variant="primary" size="sm" leadingIcon={<VideoCameraIcon size={15} />} trailingIcon={<ArrowSquareOutIcon size={13} />} className="self-start">
              Entrar na reunião
            </ExternalButtonLink>
          )}
          {event.google_event_id && <p className="text-xs text-fg-4">Sincronizado com o Google Calendar</p>}
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir evento?"
        description={`“${event.title}” será removido da sua agenda${event.google_event_id ? " e do Google Calendar" : ""}.`}
        confirmLabel="Excluir"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setDeleting(true);
          void onDelete(event).finally(() => {
            setDeleting(false);
            setConfirmDelete(false);
          });
        }}
      />
    </>
  );
}
