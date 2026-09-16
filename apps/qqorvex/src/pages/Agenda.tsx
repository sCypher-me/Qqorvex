import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button } from "@qqorvex/ui";
import {
  useEventsInRange,
  useCreateEvent,
  useDeleteEvent,
  findConflicts,
  addDays,
  addMonths,
  endOfDay,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  WeekStrip,
  WeekView,
  MonthView,
  DayAgenda,
  ListView,
  MeetingsView,
  NewZoomMeetingForm,
  QuickEventForm,
  RecurringEventsPanel,
  useCreateZoomMeeting,
} from "@qqorvex/module-agenda";
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
const WIDE_RANGE_DAYS = 60;

function rangeForView(view: ViewMode, selectedDate: Date): { start: Date; end: Date } {
  switch (view) {
    case "dia":
      return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
    case "semana":
      return { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) };
    case "mes": {
      const gridStart = startOfWeek(startOfMonth(selectedDate));
      return { start: gridStart, end: addDays(gridStart, 42) };
    }
    case "lista":
    case "reunioes":
      return { start: startOfDay(selectedDate), end: addDays(startOfDay(selectedDate), WIDE_RANGE_DAYS) };
    case "recorrentes":
      // "Recorrentes" lista as receitas, não eventos por intervalo — nunca navegada/usada pra buscar.
      return { start: startOfDay(selectedDate), end: startOfDay(selectedDate) };
  }
}

function navigate(view: ViewMode, selectedDate: Date, direction: 1 | -1): Date {
  switch (view) {
    case "dia":
      return addDays(selectedDate, direction);
    case "semana":
      return addDays(selectedDate, 7 * direction);
    case "mes":
      return addMonths(selectedDate, direction);
    case "lista":
    case "reunioes":
      return addDays(selectedDate, WIDE_RANGE_DAYS * direction);
    case "recorrentes":
      return selectedDate;
  }
}

export function AgendaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("dia");

  const { start: rangeStart, end: rangeEnd } = rangeForView(viewMode, selectedDate);
  const { events, isLoading } = useEventsInRange(supabase, rangeStart, rangeEnd);
  const createEvent = useCreateEvent(supabase, userId);
  const deleteEvent = useDeleteEvent(supabase);
  const createZoomMeeting = useCreateZoomMeeting(supabase, userId);

  const dayEvents = events.filter((e) => new Date(e.start_at) >= startOfDay(selectedDate) && new Date(e.start_at) < endOfDay(selectedDate));

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Agenda</h1>
      </div>

      <div className="w-full max-w-3xl flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {(Object.keys(VIEW_LABEL) as ViewMode[]).map((view) => (
            <Button key={view} type="button" variant={viewMode === view ? "chip-accent" : "chip"} onClick={() => setViewMode(view)}>
              {VIEW_LABEL[view]}
            </Button>
          ))}
        </div>
        {viewMode !== "dia" && viewMode !== "recorrentes" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="chip"
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, -1))}
              aria-label="Período anterior"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="chip"
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, 1))}
              aria-label="Próximo período"
            >
              ›
            </Button>
          </div>
        )}
      </div>

      {viewMode === "dia" && (
        <div className="w-full max-w-3xl">
          <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>
      )}

      {viewMode !== "recorrentes" && (
        <div className="w-full max-w-3xl">
          <QuickEventForm
            selectedDate={selectedDate}
            checkConflicts={(input) => findConflicts(events, input)}
            onCreate={(input) => createEvent.mutate(input)}
          />
        </div>
      )}

      <div className="w-full max-w-3xl">
        {viewMode === "recorrentes" ? (
          <RecurringEventsPanel client={supabase} userId={userId} />
        ) : isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : viewMode === "dia" ? (
          <DayAgenda events={dayEvents} onDelete={(id) => deleteEvent.mutate(id)} />
        ) : viewMode === "semana" ? (
          <WeekView weekAnchor={selectedDate} events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
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
          <ListView events={events} onDelete={(id) => deleteEvent.mutate(id)} />
        ) : (
          <div className="flex flex-col gap-4">
            <NewZoomMeetingForm
              isCreating={createZoomMeeting.isPending}
              onCreate={(input) => createZoomMeeting.mutateAsync(input)}
            />
            <MeetingsView events={events} onDelete={(id) => deleteEvent.mutate(id)} />
          </div>
        )}
      </div>
    </main>
  );
}
