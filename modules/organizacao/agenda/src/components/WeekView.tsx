import type { CalendarEvent } from "../types";
import { addDays, isSameDay, startOfWeek } from "../dateUtils";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 w-full">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDay(new Date(e.start_at), day))
          .sort((a, b) => a.start_at.localeCompare(b.start_at));
        const selected = isSameDay(day, selectedDate);

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            className={`flex flex-col gap-1 rounded-md border p-2 text-left min-h-[100px] ${
              selected ? "border-brand-cyan bg-surface-1" : "border-border hover:bg-surface-1"
            }`}
          >
            <p className="text-xs text-text-secondary-warm">{WEEKDAY_LABELS[day.getDay()]}</p>
            <p className="font-display text-sm font-semibold text-text-primary">{day.getDate()}</p>
            <div className="flex flex-col gap-1">
              {dayEvents.slice(0, 3).map((event) => (
                <p key={event.id} className="text-xs text-text-primary truncate">
                  {event.is_all_day ? "" : `${formatTime(event.start_at)} `}
                  {event.title}
                </p>
              ))}
              {dayEvents.length > 3 && (
                <p className="text-xs text-text-secondary-warm">+{dayEvents.length - 3} mais</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
