import type { CalendarEvent } from "../types";
import { addDays, isSameDay, startOfMonth, startOfWeek } from "../dateUtils";
import { categoryStyle } from "./EventStyle";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Mês inteiro em grade; dias fora do mês corrente ficam esmaecidos mas continuam clicáveis. */
export function MonthView({
  monthAnchor,
  events,
  selectedDate,
  onSelectDate,
}: {
  monthAnchor: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const monthStart = startOfMonth(monthAnchor);
  const gridStart = startOfWeek(monthStart);
  const weeks = Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(gridStart, week * 7 + day)),
  );

  const today = new Date();

  return (
    <div className="qv-card p-5 flex flex-col gap-2 w-full">
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-center text-[11px] tracking-[.1em] uppercase text-text-muted">
            {label}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-2">
          {week.map((day) => {
            const inMonth = day.getMonth() === monthAnchor.getMonth();
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), day));
            const selected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                aria-pressed={selected}
                className={`flex flex-col items-center justify-between gap-1.5 rounded-md border px-1 py-2 min-h-[64px] cursor-pointer transition-colors ${
                  selected
                    ? "bg-[rgba(67,185,210,.12)] border-vex-cyan-dark"
                    : inMonth
                      ? "bg-vex-graphite border-border hover:border-text-muted"
                      : "bg-transparent border-transparent opacity-40 hover:border-border"
                }`}
              >
                <span
                  className={`font-mono text-sm font-semibold ${
                    selected || isToday ? "text-vex-cyan-bright" : "text-text-primary"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 ? (
                  <span className="flex items-center gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className="w-1 h-1 rounded-full"
                        style={{ background: categoryStyle(event.category).accent }}
                        aria-hidden
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="font-mono text-[10px] text-text-muted leading-none">+{dayEvents.length - 3}</span>
                    )}
                  </span>
                ) : (
                  <span className="h-1" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
