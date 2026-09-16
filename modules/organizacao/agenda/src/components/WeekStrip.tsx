import { isSameDay, startOfWeek } from "../dateUtils";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * "A visão reduzida/padrão mostra somente uma semana por vez... permite selecionar um dia e ver
 * a agenda daquele dia sem exibir o calendário inteiro." Navegação semana anterior/próxima.
 */
export function WeekStrip({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
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

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={() => navigateWeek(-7)}
        className="px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
        aria-label="Semana anterior"
      >
        ‹
      </button>

      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`flex flex-col items-center rounded-md py-2 border ${
                selected
                  ? "bg-brand-cyan text-background border-brand-cyan"
                  : "border-border text-text-primary hover:bg-surface-1"
              }`}
            >
              <span className="text-xs">{WEEKDAY_LABELS[day.getDay()]}</span>
              <span className="font-display text-sm font-semibold">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigateWeek(7)}
        className="px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
        aria-label="Próxima semana"
      >
        ›
      </button>
    </div>
  );
}
