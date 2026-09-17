import type { CalendarEvent } from "../types";
import { addDays, isSameDay, startOfWeek } from "../dateUtils";
import { categoryStyle, formatTime } from "./EventStyle";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Semana completa: os 7 dias lado a lado, cada um já mostrando seus eventos (sem precisar clicar). */
export function WeekView({
  weekAnchor,
  events,
  selectedDate,
  onSelectDate,
}: {
  weekAnchor: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const weekStart = startOfWeek(weekAnchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 w-full">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDay(new Date(e.start_at), day))
          .sort((a, b) => a.start_at.localeCompare(b.start_at));
        const selected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            aria-pressed={selected}
            className={`flex flex-col gap-2.5 rounded-[14px] border p-2.5 text-left min-h-[180px] cursor-pointer transition-colors ${
              selected
                ? "bg-[rgba(67,185,210,.08)] border-vex-cyan-dark"
                : "bg-vex-graphite border-border hover:border-text-muted"
            }`}
          >
            <div className="flex items-baseline gap-2 px-0.5">
              <span
                className={`text-[11px] tracking-[.1em] uppercase ${selected ? "text-vex-cyan-bright" : "text-text-muted"}`}
              >
                {WEEKDAY_LABELS[day.getDay()]}
              </span>
              <span
                className={`font-mono text-[19px] font-semibold leading-none ${
                  selected || isToday ? "text-vex-cyan-bright" : "text-text-primary"
                }`}
              >
                {day.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {dayEvents.slice(0, 3).map((event) => {
                const style = categoryStyle(event.category);
                return (
                  <div
                    key={event.id}
                    className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5 min-w-0"
                    style={{ background: style.bg, borderLeft: `3px solid ${style.accent}` }}
                  >
                    {!event.is_all_day && (
                      <span className="font-mono text-[11px] text-text-secondary">{formatTime(event.start_at)}</span>
                    )}
                    <span className="text-xs font-medium text-text-primary truncate">{event.title}</span>
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <span className="text-[11px] text-text-muted px-0.5">
                  <span className="font-mono">+{dayEvents.length - 3}</span> mais
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
