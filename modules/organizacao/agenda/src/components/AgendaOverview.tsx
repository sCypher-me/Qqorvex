import { useEffect, useState } from "react";
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, ClockIcon, ConfirmDialog, PlusIcon, XIcon } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { addDays, addMonths, isSameDay, startOfMonth } from "../dateUtils";
import { EventListRow, formatDayHeader, groupEventsByDay, localDayKey, categoryStyle } from "./EventStyle";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function monthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dayNumber(date: Date): string {
  return String(date.getDate()).padStart(2, "0");
}

function getCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function calendarButtonClass({
  isSelected,
  isToday,
  isCurrentMonth,
}: {
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
}): string {
  if (isSelected) {
    return "bg-brand-primary text-white";
  }
  return [
    "text-sm transition-colors hover:bg-surface-2 hover:text-text-primary",
    isCurrentMonth ? "text-text-primary" : "text-text-muted/45",
    isToday ? "border border-vex-gold-bright/80 text-vex-gold-bright" : "border border-transparent",
  ].join(" ");
}

function eventMap(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = localDayKey(event.start_at);
    const dayEvents = map.get(key) ?? [];
    dayEvents.push(event);
    map.set(key, dayEvents);
  }
  return map;
}

function CalendarPanel({
  selectedDate,
  events,
  onSelectDate,
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(selectedDate));
  const days = getCalendarDays(monthCursor);
  const eventsByDay = eventMap(events);

  useEffect(() => {
    setMonthCursor(startOfMonth(selectedDate));
  }, [selectedDate]);

  return (
    <section className="editorial-calendar-panel min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="qv-section-label mb-1 flex items-center gap-2"><CalendarBlankIcon size={15} aria-hidden="true" /> Calendário</p>
          <h2 className="text-lg font-semibold text-text-primary">{capitalize(monthLabel(monthCursor))}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="qv-icon-btn h-8 w-8 text-base"
            onClick={() => setMonthCursor((month) => addMonths(month, -1))}
            aria-label="Mês anterior"
          >
            <CaretLeftIcon size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="qv-icon-btn h-8 w-8 text-base"
            onClick={() => setMonthCursor((month) => addMonths(month, 1))}
            aria-label="Próximo mês"
          >
            <CaretRightIcon size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-y border-border/70 py-2.5">
        <span className="text-xs text-text-muted">Escolha uma data para organizar seu dia</span>
        <button
          type="button"
          className="rounded-full border border-vex-cyan-dark/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-vex-cyan-bright transition-colors hover:bg-chip-cyan"
          onClick={() => {
            const today = new Date();
            setMonthCursor(startOfMonth(today));
            onSelectDate(today);
          }}
        >
          Hoje
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="pb-1 text-[10px] font-semibold tracking-[0.12em] text-text-muted">
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
          const dayEvents = eventsByDay.get(localDayKey(day)) ?? [];
          const markerColors = Array.from(new Set(dayEvents.map((event) => categoryStyle(event.category).accent))).slice(0, 3);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`relative flex min-h-10 flex-col items-center justify-center rounded-[10px] ${calendarButtonClass({ isSelected, isToday, isCurrentMonth })}`}
              onClick={() => {
                setMonthCursor(startOfMonth(day));
                onSelectDate(day);
              }}
              aria-label={`${day.toLocaleDateString("pt-BR", { dateStyle: "full" })}${isSelected ? ", selecionado" : ""}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : ", sem eventos"}`}
              aria-current={isToday ? "date" : undefined}
            >
              <span className="font-mono text-[13px]">{dayNumber(day)}</span>
              {markerColors.length > 0 && (
                <span className="absolute bottom-1 flex items-center gap-0.5" aria-hidden="true">
                  {markerColors.map((color) => (
                    <span key={color} className="h-1 w-1 rounded-full" style={{ background: color }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-vex-cyan" aria-hidden="true" />
        <span>Eventos marcados no calendário</span>
      </div>
    </section>
  );
}

function AgendaGroup({
  dayEvents,
  selectedDate,
  onRequestDelete,
  onRequestEdit,
}: {
  dayEvents: CalendarEvent[];
  selectedDate: Date;
  onRequestDelete: (eventId: string) => void;
  onRequestEdit: (event: CalendarEvent) => void;
}) {
  const date = new Date(dayEvents[0]!.start_at);
  const selected = isSameDay(date, selectedDate);
  const title = capitalize(formatDayHeader(dayEvents[0]!.start_at));

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-semibold ${selected ? "border-vex-cyan-dark bg-chip-cyan text-vex-cyan-bright" : "border-border bg-surface-2 text-text-secondary"}`}
        >
          {date.getDate()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted">
            {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
          </p>
        </div>
        {selected && (
          <span className="ml-auto rounded-full bg-chip-cyan px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-vex-cyan-bright">
            Selecionado
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border/80 bg-surface-1/45">
        {dayEvents.map((event) => (
          <EventListRow
            key={event.id}
            event={event}
            onOpen={() => onRequestEdit(event)}
            actions={
              <button
                type="button"
                className="qv-icon-btn shrink-0 opacity-60 transition-opacity hover:opacity-100"
                onClick={() => onRequestDelete(event.id)}
                aria-label={`Excluir "${event.title}"`}
                title="Excluir"
              >
                <XIcon size={15} aria-hidden="true" />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}

export function AgendaOverview({
  selectedDate,
  events,
  onSelectDate,
  onDelete,
  onEdit,
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onDelete: (eventId: string) => void;
  onEdit: (event: CalendarEvent) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const selectedDayEvents = sorted.filter((event) => isSameDay(new Date(event.start_at), selectedDate));
  const groups = groupEventsByDay(selectedDayEvents);
  const confirmEvent = selectedDayEvents.find((event) => event.id === confirmDeleteId) ?? null;

  return (
    <div className="editorial-agenda-split grid min-w-0 gap-0 lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.32fr)]">
      <CalendarPanel selectedDate={selectedDate} events={events} onSelectDate={onSelectDate} />

      <section className="editorial-agenda-events min-w-0 overflow-hidden">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/80 px-4 py-4 sm:px-5 sm:py-5">
          <div>
            <p className="qv-section-label mb-1">Planejamento</p>
            <h2 className="text-xl font-semibold text-text-primary">Sua agenda</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {capitalize(selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-surface-2/70 px-3 py-1.5 text-xs text-text-muted sm:inline-flex">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "evento" : "eventos"} neste dia
            </span>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-full border border-vex-cyan-dark/80 bg-chip-cyan px-3.5 text-xs font-semibold text-vex-cyan-bright transition-colors hover:border-vex-cyan hover:bg-vex-cyan/15"
              onClick={() => document.getElementById("agenda-quick-event-title")?.focus()}
            >
              <PlusIcon size={15} aria-hidden="true" />
              <span>Novo evento</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          {groups.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-surface-1/35 px-6 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-vex-cyan-dark/70 bg-chip-cyan text-lg text-vex-cyan-bright" aria-hidden="true"><ClockIcon size={20} /></span>
              <h3 className="text-sm font-semibold text-text-primary">Seu dia está livre</h3>
              <p className="mt-1 max-w-[270px] text-sm text-text-secondary">Escolha outro dia no calendário ou crie um evento para começar a organizar seu tempo.</p>
            </div>
          ) : (
            groups.map(([dayKey, dayEvents]) => (
              <AgendaGroup
                key={dayKey}
                dayEvents={dayEvents}
                selectedDate={selectedDate}
                onRequestDelete={setConfirmDeleteId}
                onRequestEdit={onEdit}
              />
            ))
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmEvent !== null}
        title={`Excluir "${confirmEvent?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmEvent) onDelete(confirmEvent.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
