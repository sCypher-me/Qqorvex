import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, CaretLeftIcon, CaretRightIcon, ChipTabs, Modal, Notice, PlusIcon, SkeletonBlock } from "@qqorvex/ui";
import {
  useEventsInRange,
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
  findConflicts,
  EventConflictError,
  listEventsInRange,
  localDateTimeToIso,
  addDays,
  addMonths,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  WeekView,
  MonthView,
  AgendaOverview,
  ListView,
  MeetingsView,
  NewZoomMeetingForm,
  QuickEventForm,
  RecurringEventsPanel,
  useCreateZoomMeeting,
  EventDetailsDialog,
  GoogleCalendarSection,
} from "@qqorvex/module-agenda";
import type { CalendarEvent, NewEventInput } from "@qqorvex/module-agenda";
import { supabase } from "../app/supabase";

type ViewMode = "dia" | "semana" | "mes" | "lista" | "reunioes" | "recorrentes";

const VIEW_LABEL: Record<ViewMode, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  lista: "Lista",
  reunioes: "Reuniões",
  recorrentes: "Recorrentes",
};
const VIEW_OPTIONS = (Object.keys(VIEW_LABEL) as ViewMode[]).map((value) => ({ value, label: VIEW_LABEL[value] }));
const DEFAULT_RANGE_DAYS = 30;

function rangeForView(view: ViewMode, selectedDate: Date, rangeDays: number): { start: Date; end: Date } {
  switch (view) {
    case "dia":
      // A visão Dia busca a semana inteira: a faixa de 7 dias marca os dias com eventos e trocar
      // de dia dentro da semana não refaz a consulta. A grade continua filtrando só o dia.
      return { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) };
    case "semana":
      return { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) };
    case "mes": {
      const gridStart = startOfWeek(startOfMonth(selectedDate));
      return { start: gridStart, end: addDays(gridStart, 42) };
    }
    case "lista":
    case "reunioes":
      return { start: startOfDay(selectedDate), end: addDays(startOfDay(selectedDate), rangeDays) };
    case "recorrentes":
      // "Recorrentes" lista as receitas, não eventos por intervalo — nunca navegada/usada pra buscar.
      return { start: startOfDay(selectedDate), end: startOfDay(selectedDate) };
  }
}

function navigate(view: ViewMode, selectedDate: Date, direction: 1 | -1, rangeDays: number): Date {
  switch (view) {
    case "dia":
      // ‹ › da barra de abas substituem as setas da faixa semanal (semana anterior/próxima).
      return addDays(selectedDate, 7 * direction);
    case "semana":
      return addDays(selectedDate, 7 * direction);
    case "mes":
      return addMonths(selectedDate, direction);
    case "lista":
    case "reunioes":
      return addDays(selectedDate, rangeDays * direction);
    case "recorrentes":
      return selectedDate;
  }
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

function periodLabel(view: ViewMode, selectedDate: Date, rangeDays: number): string | null {
  switch (view) {
    case "dia":
    case "semana": {
      const start = startOfWeek(selectedDate);
      return `${shortDate(start)} – ${shortDate(addDays(start, 6))}`;
    }
    case "mes":
      return selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    case "lista":
    case "reunioes":
      return `${shortDate(selectedDate)} – ${shortDate(addDays(selectedDate, rangeDays - 1))}`;
    case "recorrentes":
      return null;
  }
}

function readStoredDate(): Date {
  const stored = window.localStorage.getItem("qqorvex:agenda-date");
  if (!stored) return new Date();
  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function readStoredView(): ViewMode {
  const stored = window.localStorage.getItem("qqorvex:agenda-view");
  return stored && stored in VIEW_LABEL ? (stored as ViewMode) : "dia";
}

function readStoredRange(): number {
  const stored = Number(window.localStorage.getItem("qqorvex:agenda-range"));
  return [7, 30, 60, 90].includes(stored) ? stored : DEFAULT_RANGE_DAYS;
}

const NAV_BUTTON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-text-secondary cursor-pointer hover:text-text-primary hover:border-text-muted transition-colors";

export function AgendaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [selectedDate, setSelectedDate] = useState(() => readStoredDate());
  const [viewMode, setViewMode] = useState<ViewMode>(() => readStoredView());
  const [rangeDays, setRangeDays] = useState(() => readStoredRange());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isZoomDialogOpen, setIsZoomDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const { start: rangeStart, end: rangeEnd } = rangeForView(viewMode, selectedDate, rangeDays);
  const { events, isLoading, error, refetch } = useEventsInRange(supabase, rangeStart, rangeEnd);
  const createEvent = useCreateEvent(supabase, userId);
  const deleteEvent = useDeleteEvent(supabase);
  const updateEvent = useUpdateEvent(supabase);
  const createZoomMeeting = useCreateZoomMeeting(supabase, userId);

  const period = periodLabel(viewMode, selectedDate, rangeDays);
  const selectedDayEvents = useMemo(() => events.filter((event) => {
    const date = new Date(event.start_at);
    return date.getFullYear() === selectedDate.getFullYear()
      && date.getMonth() === selectedDate.getMonth()
      && date.getDate() === selectedDate.getDate();
  }), [events, selectedDate]);
  const nextEvent = useMemo(() => [...events].filter((event) => new Date(event.end_at).getTime() >= Date.now()).sort((a, b) => a.start_at.localeCompare(b.start_at))[0] ?? null, [events]);
  const selectedDateIsToday = selectedDate.toDateString() === new Date().toDateString();

  useEffect(() => {
    window.localStorage.setItem("qqorvex:agenda-view", viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem("qqorvex:agenda-date", selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    window.localStorage.setItem("qqorvex:agenda-range", String(rangeDays));
  }, [rangeDays]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function handleCreate(input: NewEventInput, ignoreConflicts = false) {
    if (!ignoreConflicts) {
      const conflicts = await findPersistedConflicts(input);
      if (conflicts.length > 0) throw new EventConflictError(conflicts);
    }
    await createEvent.mutateAsync(input);
    setFeedback({ tone: "success", message: "Evento criado e adicionado à sua agenda." });
  }

  async function handleDelete(eventId: string) {
    await deleteEvent.mutateAsync(eventId);
    setFeedback({ tone: "success", message: "Evento excluído da agenda." });
  }

  function requestDelete(eventId: string) {
    void handleDelete(eventId).catch((deleteError) => {
      setFeedback({ tone: "error", message: deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o evento." });
    });
  }

  async function findPersistedConflicts(input: NewEventInput, excludeEventId?: string) {
    const candidateStart = new Date(input.startAt);
    const dayStart = startOfDay(candidateStart);
    const dayEnd = addDays(dayStart, 1);
    const eventsForDay = await listEventsInRange(supabase, dayStart.toISOString(), dayEnd.toISOString());
    return findConflicts(eventsForDay, {
      startAt: input.startAt,
      endAt: input.endAt,
      excludeEventId,
    });
  }

  async function handleUpdate(eventId: string, input: NewEventInput, ignoreConflicts = false) {
    if (!ignoreConflicts) {
      const conflicts = await findPersistedConflicts(input, eventId);
      if (conflicts.length > 0) throw new EventConflictError(conflicts);
    }
    await updateEvent.mutateAsync({ eventId, input });
    setFeedback({ tone: "success", message: "Evento atualizado com sucesso." });
  }

  async function handleMoveEvent(event: CalendarEvent, targetDate: Date) {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const date = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    const time = (value: Date) => `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    const input: NewEventInput = {
        title: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        meetingLink: event.meeting_link ?? undefined,
        category: event.category ?? "compromisso",
        isAllDay: event.is_all_day,
        startAt: localDateTimeToIso(date, event.is_all_day ? "00:00" : time(start)),
        endAt: localDateTimeToIso(date, event.is_all_day ? "23:59" : time(end), event.is_all_day ? 59 : 0),
      };
    const conflicts = await findPersistedConflicts(input, event.id);
    if (conflicts.length > 0) throw new EventConflictError(conflicts);
    await updateEvent.mutateAsync({ eventId: event.id, input });
    setFeedback({ tone: "success", message: "Evento movido para o novo dia." });
  }

  function requestMoveEvent(event: CalendarEvent, targetDate: Date) {
    void handleMoveEvent(event, targetDate).catch((moveError) => {
      setFeedback({ tone: "error", message: moveError instanceof Error ? moveError.message : "Não foi possível mover o evento." });
    });
  }

  async function handleZoomMeeting(input: { title: string; startAt: string; endAt: string }) {
    await createZoomMeeting.mutateAsync(input);
    setFeedback({ tone: "success", message: "Reunião criada e adicionada à sua agenda." });
  }

  function focusQuickEvent() {
    setIsEventDialogOpen(true);
  }

  function focusZoomMeeting() {
    setIsZoomDialogOpen(true);
  }

  return (
    <div className="qv-page editorial-agenda-page flex flex-col gap-6">
      <section className="editorial-agenda-header flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="editorial-eyebrow m-0">ORGANIZAÇÃO / TEMPO</p>
          <h1 className="m-0 mt-4 text-[clamp(34px,4vw,53px)] font-bold leading-none tracking-[-0.055em] text-text-primary">Agenda</h1>
          <p className="m-0 mt-3 max-w-[520px] text-[15px] leading-relaxed text-text-muted">Um lugar para planejar o tempo com clareza.</p>
        </div>
        {viewMode === "dia" && (
          <div className="editorial-agenda-date w-full text-left sm:w-auto sm:text-right">
            <p className="editorial-eyebrow m-0">DIA SELECIONADO</p>
            <p className="mt-1 text-sm font-medium capitalize text-text-primary">
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        )}
      </section>

      <div className="editorial-agenda-toolbar flex items-center gap-2 flex-wrap">
        <ChipTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} className="editorial-task-tabs editorial-agenda-view-tabs" />
        <span className="flex-1" />
        {viewMode !== "recorrentes" && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
            Hoje
          </Button>
        )}
        {(viewMode === "lista" || viewMode === "reunioes") && (
          <select value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value))} aria-label="Período da agenda" className="qv-field w-auto py-2 font-mono text-xs">
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        )}
        {period && viewMode !== "recorrentes" && (
          <>
            <span className="font-mono text-xs text-text-muted mr-1">{period}</span>
            <button
              type="button"
              className={NAV_BUTTON_CLASS}
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, -1, rangeDays))}
              aria-label="Período anterior"
            >
              <CaretLeftIcon size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={NAV_BUTTON_CLASS}
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, 1, rangeDays))}
              aria-label="Próximo período"
            >
              <CaretRightIcon size={17} aria-hidden="true" />
            </button>
          </>
        )}
        {viewMode !== "recorrentes" && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={viewMode === "reunioes" ? focusZoomMeeting : focusQuickEvent}
          >
            <PlusIcon size={15} aria-hidden="true" />
            {viewMode === "reunioes" ? "Nova reunião" : "Novo evento"}
          </Button>
        )}
      </div>

      {viewMode !== "recorrentes" && (
        <div className="editorial-agenda-summary grid gap-2.5 sm:grid-cols-3" aria-label="Resumo da agenda">
          <div className="flex min-w-0 items-center gap-2 px-1 py-2">
            <strong className="text-lg text-text-primary">{isLoading ? "—" : selectedDayEvents.length}</strong>
            <span className="truncate text-xs text-text-muted">{selectedDateIsToday ? "eventos hoje" : "no dia selecionado"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 px-1 py-2">
            <span className="shrink-0 text-xs text-text-muted">Próximo</span>
            <strong className="truncate text-xs font-medium text-text-primary">
              {isLoading ? "Carregando…" : nextEvent ? `${new Date(nextEvent.start_at).toLocaleString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${nextEvent.title}` : "Sem eventos futuros no período"}
            </strong>
          </div>
          <div className="flex min-w-0 items-center gap-2 px-1 py-2">
            <strong className="text-lg text-text-primary">{isLoading ? "—" : events.length}</strong>
            <span className="truncate text-xs text-text-muted">no período</span>
          </div>
        </div>
      )}

      {feedback && <Notice tone={feedback.tone} title={feedback.tone === "success" ? "Agenda atualizada" : "Algo deu errado"}>{feedback.message}</Notice>}
      {error && (
        <Notice tone="error" title="Não foi possível carregar a agenda" actions={<Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}>
          Verifique sua conexão e tente novamente. Os controles de criação continuam disponíveis.
        </Notice>
      )}

      {viewMode === "recorrentes" ? (
        <div className="flex flex-col gap-4">
          <RecurringEventsPanel client={supabase} userId={userId} />
          <section className="qv-card p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="qv-section-label mb-1">Integrações</p>
                <h2 className="text-lg font-semibold text-text-primary">Calendários externos</h2>
              </div>
              <span className="text-xs text-text-muted">Sincronize sem duplicar eventos</span>
            </div>
            <GoogleCalendarSection
              client={supabase}
              userId={userId}
              supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
              googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            />
          </section>
        </div>
      ) : isLoading ? (
        <div className="editorial-agenda-loading qv-card p-4 sm:p-5" aria-busy="true">
          <span className="sr-only" role="status">Carregando eventos da agenda…</span>
          <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(230px,.78fr)_minmax(0,1.32fr)]">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <SkeletonBlock className="h-5 w-36 rounded-md" />
                <SkeletonBlock className="h-8 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }, (_, index) => <SkeletonBlock key={index} className="h-9 rounded-lg" />)}
              </div>
              <SkeletonBlock className="hidden h-3 w-40 rounded-md lg:block" />
            </div>
            <div className="flex flex-col gap-4 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <SkeletonBlock className="h-3 w-24 rounded-md" />
              <SkeletonBlock className="h-6 w-44 rounded-md" />
              <SkeletonBlock className="h-4 w-56 rounded-md" />
              <div className="mt-2 flex flex-col gap-3">
                {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-14 rounded-xl" />)}
              </div>
              <span className="text-xs text-text-muted">Carregando seus compromissos…</span>
            </div>
          </div>
        </div>
      ) : viewMode === "dia" ? (
        <AgendaOverview
          selectedDate={selectedDate}
          events={events}
          onSelectDate={setSelectedDate}
          onDelete={requestDelete}
          onEdit={setSelectedEvent}
        />
      ) : viewMode === "semana" ? (
        <WeekView weekAnchor={selectedDate} events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} onEdit={setSelectedEvent} onMove={requestMoveEvent} />
      ) : viewMode === "mes" ? (
        <MonthView
          monthAnchor={selectedDate}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setViewMode("dia");
          }}
        />
      ) : viewMode === "lista" ? (
        <ListView events={events} onDelete={requestDelete} onEdit={setSelectedEvent} onCreate={focusQuickEvent} />
      ) : (
        <div className="flex flex-col gap-[18px]">
          <MeetingsView events={events} onDelete={requestDelete} onEdit={setSelectedEvent} onCreate={focusZoomMeeting} />
        </div>
      )}

      <Modal isOpen={isEventDialogOpen} onClose={() => setIsEventDialogOpen(false)} title="Novo evento" size="lg">
        <p className="-mt-3 text-sm leading-relaxed text-text-muted">Comece pelo título e horário. Categoria, lembrete e outros detalhes podem ser ajustados aqui também.</p>
        <QuickEventForm
          selectedDate={selectedDate}
          checkConflicts={(input) => findConflicts(events, input)}
          onCreate={async (input, ignoreConflicts) => {
            await handleCreate(input, ignoreConflicts);
            setIsEventDialogOpen(false);
          }}
          isCreating={createEvent.isPending}
        />
      </Modal>

      <Modal isOpen={isZoomDialogOpen} onClose={() => setIsZoomDialogOpen(false)} title="Agendar reunião" size="lg">
        <p className="-mt-3 text-sm leading-relaxed text-text-muted">Defina o assunto e o horário. A reunião será criada no Zoom e adicionada à sua agenda.</p>
        <NewZoomMeetingForm
          isCreating={createZoomMeeting.isPending}
          onCreate={async (input) => {
            await handleZoomMeeting(input);
            setIsZoomDialogOpen(false);
          }}
        />
      </Modal>

      <EventDetailsDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSave={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
