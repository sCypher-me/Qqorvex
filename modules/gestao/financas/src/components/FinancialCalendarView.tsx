import { addCalendarDays, isSameCalendarDay, startOfCalendarMonth, startOfCalendarWeek } from "../service";
import type { RecurringTransaction, Transaction } from "../types";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * "Calendário Financeiro dedicado" — grade de mês própria de Finanças (não deriva de
 * `@qqorvex/module-agenda`). Ponto sólido = movimentação real no dia; ponto contornado =
 * cobrança de recorrência ativa projetada pra esse dia (`next_occurrence_date`, ainda não virou
 * transação — Finanças nunca inventa uma transação só para aparecer no calendário).
 */
export function FinancialCalendarView({
  monthAnchor,
  transactions,
  recurringTransactions,
  selectedDate,
  onSelectDate,
}: {
  monthAnchor: Date;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const monthStart = startOfCalendarMonth(monthAnchor);
  const gridStart = startOfCalendarWeek(monthStart);
  const weeks = Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addCalendarDays(gridStart, week * 7 + day)),
  );
  const today = new Date();
  const activeRecurring = recurringTransactions.filter((r) => r.status === "ativa");

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
            const hasTransaction = transactions.some((t) => isSameCalendarDay(new Date(`${t.date}T00:00:00`), day));
            const hasProjected = activeRecurring.some((r) =>
              isSameCalendarDay(new Date(`${r.next_occurrence_date}T00:00:00`), day),
            );
            const selected = isSameCalendarDay(day, selectedDate);

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
                } ${isSameCalendarDay(day, today) ? "font-bold text-brand-cyan" : "text-text-primary"}`}
              >
                <span className="text-xs">{day.getDate()}</span>
                <span className="flex gap-0.5">
                  {hasTransaction && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />}
                  {hasProjected && <span className="w-1.5 h-1.5 rounded-full border border-brand-cyan" />}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
