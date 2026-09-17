import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { ChipTabs, EmptyState } from "@qqorvex/ui";
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
const VIEW_OPTIONS = (Object.keys(VIEW_LABEL) as ViewMode[]).map((value) => ({ value, label: VIEW_LABEL[value] }));
const WIDE_RANGE_DAYS = 60;

function rangeForView(view: ViewMode, selectedDate: Date): { start: Date; end: Date } {
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
      return { start: startOfDay(selectedDate), end: addDays(startOfDay(selectedDate), WIDE_RANGE_DAYS) };
    case "recorrentes":
      // "Recorrentes" lista as receitas, não eventos por intervalo — nunca navegada/usada pra buscar.
      return { start: startOfDay(selectedDate), end: startOfDay(selectedDate) };
  }
}

function navigate(view: ViewMode, selectedDate: Date, direction: 1 | -1): Date {
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
      return addDays(selectedDate, WIDE_RANGE_DAYS * direction);
    case "recorrentes":
      return selectedDate;
  }
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

function periodLabel(view: ViewMode, selectedDate: Date): string | null {
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
      return `${shortDate(selectedDate)} – ${shortDate(addDays(selectedDate, WIDE_RANGE_DAYS - 1))}`;
    case "recorrentes":
      return null;
  }
}

const NAV_BUTTON_CLASS =
  "w-[34px] h-[34px] shrink-0 rounded-[10px] border border-border bg-vex-obsidian text-text-secondary text-base cursor-pointer hover:text-text-primary hover:border-text-muted transition-colors";

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
  const period = periodLabel(viewMode, selectedDate);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-2 flex-wrap">
        <ChipTabs options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
        <span className="flex-1" />
        {period && viewMode !== "recorrentes" && (
          <>
            <span className="font-mono text-xs text-text-muted mr-1">{period}</span>
            <button
              type="button"
              className={NAV_BUTTON_CLASS}
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, -1))}
              aria-label="Período anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className={NAV_BUTTON_CLASS}
              onClick={() => setSelectedDate((d) => navigate(viewMode, d, 1))}
              aria-label="Próximo período"
            >
              ›
            </button>
          </>
        )}
      </div>

      {viewMode === "dia" && (
        <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} events={events} showNavigation={false} />
      )}

      {viewMode !== "recorrentes" && (
        <QuickEventForm
          selectedDate={selectedDate}
          checkConflicts={(input) => findConflicts(events, input)}
          onCreate={(input) => createEvent.mutate(input)}
        />
      )}

      {viewMode === "recorrentes" ? (
        <RecurringEventsPanel client={supabase} userId={userId} />
      ) : isLoading ? (
        <div className="qv-card p-5">
          <EmptyState>Carregando...</EmptyState>
        </div>
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
        <div className="flex flex-col gap-[18px]">
          <NewZoomMeetingForm
            isCreating={createZoomMeeting.isPending}
            onCreate={(input) => createZoomMeeting.mutateAsync(input)}
          />
          <MeetingsView events={events} onDelete={(id) => deleteEvent.mutate(id)} />
        </div>
      )}
    </div>
  );
}
