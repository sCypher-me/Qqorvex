import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  DotsThreeIcon,
  LinkSimpleIcon,
  PlusIcon,
  RepeatIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import {
  AgendaList,
  EventConflictError,
  EventDetails,
  EventEditor,
  GoogleCalendarSection,
  MiniMonth,
  MonthGrid,
  RecurringEventsPanel,
  TimeGrid,
  addDays,
  addMonths,
  createZoomMeeting,
  eventsOnDay,
  findConflicts,
  findFreeSlots,
  listEventsInRange,
  startOfDay,
  startOfMonth,
  useCreateEvent,
  useDeleteEvent,
  useEventsInRange,
  useUpdateEvent,
  weekDays,
  type CalendarEvent,
  type EventDraft,
  type NewEventInput,
} from "@qqorvex/module-agenda";
import { CompleteToggle, localDateKey, useTasks, useUpdateTaskStatus, type TaskWithConditions } from "@qqorvex/module-tarefas";
import { Button, DropdownMenu, IconButton, Modal, Notice, PageContainer, PageHeader, Segmented, Skeleton, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";

type View = "dia" | "semana" | "mes" | "lista";
const VIEWS: View[] = ["dia", "semana", "mes", "lista"];

function readView(): View {
  try {
    const stored = window.localStorage.getItem("qqorvex.agenda.view") as View | null;
    if (stored && VIEWS.includes(stored)) return stored;
  } catch {
    /* opcional */
  }
  return window.matchMedia("(min-width: 768px)").matches ? "semana" : "dia";
}

function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y = 0, m = 1, d = 1] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function rangeFor(view: View, date: Date): { start: Date; end: Date } {
  if (view === "dia") return { start: startOfDay(date), end: addDays(startOfDay(date), 1) };
  if (view === "semana") {
    const days = weekDays(date);
    return { start: days[0]!, end: addDays(days[6]!, 1) };
  }
  if (view === "mes") {
    const first = startOfMonth(date);
    const gridStart = addDays(first, -first.getDay());
    return { start: gridStart, end: addDays(gridStart, 42) };
  }
  return { start: startOfDay(date), end: addDays(startOfDay(date), 30) };
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function periodLabel(view: View, date: Date): string {
  return capitalizeFirst(rawPeriodLabel(view, date));
}

function rawPeriodLabel(view: View, date: Date): string {
  if (view === "dia") return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  if (view === "mes") return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  if (view === "semana") {
    const days = weekDays(date);
    const first = days[0]!;
    const last = days[6]!;
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
      ? `${first.getDate()} – ${last.getDate()} de ${last.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`
      : `${first.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `Próximos 30 dias`;
}

function toInput(event: CalendarEvent, start: Date, end: Date): NewEventInput {
  return {
    title: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    meetingLink: event.meeting_link ?? undefined,
    category: event.category,
    isAllDay: event.is_all_day,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? (m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m} min`;
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaPage() {
  const { userId } = useAccount();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>(() => (parseDateParam(searchParams.get("data")) ? "dia" : readView()));
  const [date, setDate] = useState<Date>(() => parseDateParam(searchParams.get("data")) ?? startOfDay(new Date()));
  const [miniMonth, setMiniMonth] = useState(() => startOfMonth(date));
  const [editor, setEditor] = useState<{ event: CalendarEvent | null; draft: EventDraft | null; taskId?: string } | null>(null);
  const [details, setDetails] = useState<CalendarEvent | null>(null);
  const [panel, setPanel] = useState<"recorrentes" | "integracoes" | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem("qqorvex.agenda.view", view);
    } catch {
      /* opcional */
    }
  }, [view]);

  useEffect(() => {
    if (!searchParams.get("data")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("data");
    setSearchParams(next, { replace: true });
    // Parâmetro consumido na inicialização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setMiniMonth(startOfMonth(date)), [date]);

  const range = rangeFor(view, date);
  const { events, isLoading, error, refetch } = useEventsInRange(supabase, range.start, range.end);
  const miniRange = rangeFor("mes", miniMonth);
  const { events: miniEvents } = useEventsInRange(supabase, miniRange.start, miniRange.end);
  const dayRange = rangeFor("dia", date);
  const { events: dayEvents } = useEventsInRange(supabase, dayRange.start, dayRange.end);
  const createEvent = useCreateEvent(supabase, userId);
  const updateEvent = useUpdateEvent(supabase);
  const deleteEvent = useDeleteEvent(supabase);
  const { tasks } = useTasks(supabase, userId);
  const updateTaskStatus = useUpdateTaskStatus(supabase);

  const days = useMemo(() => (view === "dia" ? [startOfDay(date)] : weekDays(date)), [view, date]);
  const selectedKey = localDateKey(date);
  const tasksForDay = tasks.filter((task) => task.due_date === selectedKey || (selectedKey === localDateKey() && task.isOverdue));
  const freeSlots = useMemo(() => {
    const start = new Date(startOfDay(date).getTime() + 8 * 3_600_000);
    const end = new Date(startOfDay(date).getTime() + 20 * 3_600_000);
    const from = start < new Date() && localDateKey(date) === localDateKey() ? new Date(Math.ceil(Date.now() / 900_000) * 900_000) : start;
    return from < end ? findFreeSlots(dayEvents, from, end, 30) : [];
  }, [date, dayEvents]);

  function shift(direction: 1 | -1) {
    setDate((current) => (view === "dia" ? addDays(current, direction) : view === "semana" ? addDays(current, 7 * direction) : view === "mes" ? addMonths(current, direction) : addDays(current, 30 * direction)));
  }

  async function serverConflicts(input: NewEventInput, excludeEventId?: string) {
    const start = startOfDay(new Date(input.startAt));
    const list = await listEventsInRange(supabase, start.toISOString(), addDays(start, 1).toISOString());
    return findConflicts(list, { startAt: input.startAt, endAt: input.endAt, excludeEventId });
  }

  async function submitEditor(input: NewEventInput, options: { ignoreConflicts: boolean; createZoom: boolean }) {
    const editing = editor?.event ?? null;
    if (!options.ignoreConflicts && !input.isAllDay) {
      const conflicts = await serverConflicts(input, editing?.id);
      if (conflicts.length) throw new EventConflictError(conflicts);
    }
    if (editing) {
      await updateEvent.mutateAsync({ eventId: editing.id, input });
      toast({ title: "Evento atualizado", description: input.title, tone: "success" });
      return;
    }
    let meetingLink = input.meetingLink;
    if (options.createZoom) {
      const { joinUrl } = await createZoomMeeting(supabase, { title: input.title, startAt: input.startAt, endAt: input.endAt });
      meetingLink = joinUrl;
    }
    await createEvent.mutateAsync({ ...input, meetingLink, taskId: editor?.taskId });
    toast({ title: "Evento criado", description: input.title, tone: "success" });
  }

  function moveEvent(event: CalendarEvent, start: Date, end: Date, force = false) {
    const input = toInput(event, start, end);
    void (async () => {
      if (!force) {
        const conflicts = await serverConflicts(input, event.id);
        if (conflicts.length) {
          toast({
            title: "Horário ocupado",
            description: `Conflita com ${conflicts.map((item) => item.title).join(", ")}.`,
            tone: "danger",
            action: { label: "Mover assim mesmo", onClick: () => moveEvent(event, start, end, true) },
          });
          return;
        }
      }
      await updateEvent.mutateAsync({ eventId: event.id, input });
      toast({ title: "Evento movido", description: `${event.title} · ${start.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" })}, ${fmtTime(start)}` });
    })().catch(() => toast({ title: "Não foi possível mover o evento", tone: "danger" }));
  }

  function scheduleTask(task: TaskWithConditions) {
    const duration = Math.max(15, task.estimated_minutes ?? 60);
    const slot = freeSlots.find((item) => (item.end.getTime() - item.start.getTime()) / 60_000 >= duration);
    const start = slot?.start ?? new Date(startOfDay(date).getTime() + 9 * 3_600_000);
    setEditor({ event: null, draft: { start, end: new Date(start.getTime() + duration * 60_000), title: task.title }, taskId: task.id });
  }

  const counts = view === "dia" ? eventsOnDay(events, date).length : events.length;

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Agenda"
        description={`${periodLabel(view, date)}${isLoading ? "" : ` · ${counts} ${counts === 1 ? "evento" : "eventos"}`}`}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-line bg-raised shadow-sm">
              <IconButton label="Anterior" size="md" onClick={() => shift(-1)} className="rounded-r-none">
                <CaretLeftIcon />
              </IconButton>
              <button type="button" onClick={() => setDate(startOfDay(new Date()))} className="h-8 border-x border-line px-3 text-[13px] font-medium text-fg-2 hover:bg-hover hover:text-fg">
                Hoje
              </button>
              <IconButton label="Próximo" size="md" onClick={() => shift(1)} className="rounded-l-none">
                <CaretRightIcon />
              </IconButton>
            </div>
            <Segmented
              label="Visualização"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "dia", label: "Dia" },
                { value: "semana", label: "Semana" },
                { value: "mes", label: "Mês" },
                { value: "lista", label: "Lista" },
              ]}
            />
            <DropdownMenu
              label="Mais opções da agenda"
              items={[
                { label: "Eventos que se repetem", icon: <RepeatIcon />, onSelect: () => setPanel("recorrentes") },
                { label: "Integrações (Google, Zoom)", icon: <LinkSimpleIcon />, onSelect: () => setPanel("integracoes") },
              ]}
              trigger={(props) => (
                <IconButton label="Mais opções" variant="secondary" {...props}>
                  <DotsThreeIcon weight="bold" />
                </IconButton>
              )}
            />
            <Button size="sm" leadingIcon={<PlusIcon size={15} weight="bold" />} onClick={() => {
              const start = new Date(Math.max(Date.now(), startOfDay(date).getTime() + 9 * 3_600_000));
              start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
              setEditor({ event: null, draft: { start, end: new Date(start.getTime() + 3_600_000) } });
            }}>
              Novo evento
            </Button>
          </>
        }
      />

      {error && (
        <Notice title="Não foi possível carregar a agenda" actions={<Button size="sm" variant="secondary" onClick={() => void refetch()}>Tentar novamente</Button>}>
          Verifique sua conexão. Você ainda pode criar eventos.
        </Notice>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-[560px] w-full rounded-xl" />
          ) : view === "mes" ? (
            <MonthGrid anchor={date} events={events} selectedDate={date} onOpenEvent={setDetails} onSelectDay={(day) => { setDate(day); setView("dia"); }} />
          ) : view === "lista" ? (
            <AgendaList events={events} from={date} days={30} onOpenEvent={setDetails} onCreate={() => setEditor({ event: null, draft: { start: new Date(startOfDay(date).getTime() + 9 * 3_600_000), end: new Date(startOfDay(date).getTime() + 10 * 3_600_000) } })} />
          ) : (
            <TimeGrid
              days={days}
              events={events}
              onCreateAt={(start, end) => setEditor({ event: null, draft: { start, end } })}
              onOpenEvent={setDetails}
              onMoveEvent={(event, start, end) => moveEvent(event, start, end)}
              onSelectDay={view === "semana" ? (day) => { setDate(day); setView("dia"); } : undefined}
            />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Resumo do dia">
          <div className="hidden rounded-xl border border-line bg-surface p-4 xl:block">
            <MiniMonth month={miniMonth} selectedDate={date} events={miniEvents} onChangeMonth={setMiniMonth} onSelectDay={(day) => setDate(day)} />
          </div>

          <section className="rounded-xl border border-line bg-surface">
            <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <h2 className="text-[13px] font-semibold text-fg-2">Tarefas {localDateKey(date) === localDateKey() ? "de hoje" : `de ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`}</h2>
              <span className="text-xs tabular-nums text-fg-4">{tasksForDay.filter((task) => task.status !== "concluido").length}</span>
            </header>
            {tasksForDay.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-fg-3">Nenhuma tarefa com prazo neste dia.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {tasksForDay.slice(0, 8).map((task) => (
                  <li key={task.id} className="group flex items-center gap-2.5 px-4 py-2.5">
                    <CompleteToggle size={16} done={task.status === "concluido"} label={`Concluir ${task.title}`} onToggle={() => updateTaskStatus.mutate({ taskId: task.id, status: task.status === "concluido" ? "nao_iniciado" : "concluido" })} />
                    <span className={cx("min-w-0 flex-1 truncate text-[13px]", task.status === "concluido" ? "text-fg-4 line-through" : task.isOverdue ? "text-danger" : "text-fg")}>{task.title}</span>
                    {task.status !== "concluido" && (
                      <button type="button" onClick={() => scheduleTask(task)} title="Reservar tempo na agenda" aria-label={`Reservar tempo para ${task.title}`} className="flex h-6 items-center gap-1 rounded-md px-1.5 text-2xs font-medium text-fg-4 opacity-100 transition-opacity hover:bg-hover hover:text-gold-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                        <TimerIcon size={13} /> Reservar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-line bg-surface">
            <header className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
              <ClockIcon size={15} className="text-fg-4" />
              <h2 className="text-[13px] font-semibold text-fg-2">Janelas livres</h2>
              <span className="ml-auto text-2xs text-fg-4">08h–20h</span>
            </header>
            {freeSlots.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-fg-3">Sem janelas de 30 min ou mais neste dia.</p>
            ) : (
              <ul className="flex flex-col gap-0.5 p-2">
                {freeSlots.slice(0, 6).map((slot) => {
                  const minutes = (slot.end.getTime() - slot.start.getTime()) / 60_000;
                  return (
                    <li key={slot.start.toISOString()}>
                      <button
                        type="button"
                        onClick={() => setEditor({ event: null, draft: { start: slot.start, end: new Date(slot.start.getTime() + Math.min(minutes, 60) * 60_000) } })}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-hover"
                      >
                        <span className="tabular-nums text-fg">{fmtTime(slot.start)} – {fmtTime(slot.end)}</span>
                        <span className="ml-auto text-xs text-fg-4">{formatDuration(minutes)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <EventEditor
        isOpen={editor !== null}
        event={editor?.event ?? null}
        draft={editor?.draft ?? null}
        onClose={() => setEditor(null)}
        onSubmit={submitEditor}
      />
      <EventDetails
        event={details}
        onClose={() => setDetails(null)}
        onEdit={(event) => {
          setDetails(null);
          setEditor({ event, draft: null });
        }}
        onDuplicate={(event) => {
          setDetails(null);
          setEditor({ event: null, draft: { start: new Date(event.start_at), end: new Date(event.end_at), title: event.title, allDay: event.is_all_day } });
        }}
        onDelete={async (event) => {
          await deleteEvent.mutateAsync(event.id);
          setDetails(null);
          toast({ title: "Evento excluído", description: event.title });
        }}
      />
      <Modal isOpen={panel === "recorrentes"} onClose={() => setPanel(null)} title="Eventos que se repetem" description="Cada repetição cria um evento comum na data certa." size="lg" icon={<RepeatIcon />}>
        <RecurringEventsPanel client={supabase} userId={userId} />
      </Modal>
      <Modal isOpen={panel === "integracoes"} onClose={() => setPanel(null)} title="Integrações da agenda" size="md" icon={<CalendarBlankIcon />}>
        <GoogleCalendarSection client={supabase} userId={userId} supabaseUrl={import.meta.env.VITE_SUPABASE_URL} googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID} />
        <p className="text-[13px] leading-relaxed text-fg-3">
          <strong className="font-medium text-fg-2">Zoom:</strong> ao criar um evento, ative “Gerar reunião no Zoom” para criar a sala e anexar o link automaticamente.
        </p>
      </Modal>
    </PageContainer>
  );
}
