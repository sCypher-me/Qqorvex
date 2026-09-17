import type { CalendarEvent } from "../types";
import { isSameDay, startOfWeek } from "../dateUtils";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * "A visão reduzida/padrão mostra somente uma semana por vez... permite selecionar um dia e ver
 * a agenda daquele dia sem exibir o calendário inteiro." Navegação semana anterior/próxima —
 * `showNavigation={false}` quando a página já oferece ‹ › na barra de abas (layout do mock).
 * `events` (opcional) marca com um ponto os dias que têm algo agendado.
 */
export function WeekStrip({
  selectedDate,
  onSelectDate,
  events,
  showNavigation = true,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events?: CalendarEvent[];
  showNavigation?: boolean;
}) {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  function navigateWeek(directionDays: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + directionDays);
    onSelectDate(next);
  }

  const navButtonClass =
    "w-[34px] h-[34px] shrink-0 rounded-[10px] border border-border bg-vex-obsidian text-text-secondary text-base cursor-pointer hover:text-text-primary hover:border-text-muted transition-colors";

  return (
    <div className="flex items-center gap-2 w-full">
      {showNavigation && (
        <button type="button" onClick={() => navigateWeek(-7)} className={navButtonClass} aria-label="Semana anterior">
          ‹
        </button>
      )}

      <div className="flex-1 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const hasEvents = events?.some((e) => isSameDay(new Date(e.start_at), day)) ?? false;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-[14px] border cursor-pointer transition-colors ${
                selected
                  ? "bg-[rgba(67,185,210,.12)] border-vex-cyan-dark text-vex-cyan-bright"
                  : "bg-vex-graphite border-border text-text-secondary hover:border-text-muted"
              }`}
            >
              <span className="text-[11px] tracking-[.1em] uppercase opacity-75">{WEEKDAY_LABELS[day.getDay()]}</span>
              <span className="font-mono text-[19px] font-semibold leading-none">{day.getDate()}</span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: hasEvents ? "var(--color-vex-cyan)" : "transparent" }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {showNavigation && (
        <button type="button" onClick={() => navigateWeek(7)} className={navButtonClass} aria-label="Próxima semana">
          ›
        </button>
      )}
    </div>
  );
}
