import type { CalendarEvent } from "../types";
import { addDays, isSameDay, startOfMonth, startOfWeek } from "../dateUtils";

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
    <div className="flex flex-col gap-1 w-full">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <p key={label} className="text-center text-xs text-text-secondary-warm">
            {label}
          </p>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const inMonth = day.getMonth() === monthAnchor.getMonth();
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), day));
            const selected = isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`flex flex-col items-center gap-1 rounded-md border p-1 min-h-[52px] ${
                  selected
                    ? "border-brand-cyan bg-surface-1"
                    : inMonth
                      ? "border-border hover:bg-surface-1"
                      : "border-transparent opacity-40 hover:bg-surface-1"
                } ${isSameDay(day, today) ? "font-bold text-brand-cyan" : "text-text-primary"}`}
              >
                <span className="text-xs">{day.getDate()}</span>
                {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
