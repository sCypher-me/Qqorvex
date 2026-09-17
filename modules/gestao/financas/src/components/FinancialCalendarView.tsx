import { addCalendarDays, isSameCalendarDay, startOfCalendarMonth, startOfCalendarWeek } from "../service";
import type { RecurringTransaction, Transaction } from "../types";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * "Calendário Financeiro dedicado" — grade de mês própria de Finanças (não deriva de
 * `@qqorvex/module-agenda`). Ponto sólido = movimentação real no dia; ponto contornado =
 * cobrança de recorrência ativa projetada pra esse dia (`next_occurrence_date`, ainda não virou
 * transação — Finanças nunca inventa uma transação só para aparecer no calendário).
 * Cor do ponto: vermelho = saída, verde = entrada.
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
  const leadingBlanks = Math.round((monthStart.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000));
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => addCalendarDays(monthStart, i));
  const today = new Date();
  const activeRecurring = recurringTransactions.filter((r) => r.status === "ativa");

  return (
    <div className="grid grid-cols-7 gap-1.5 w-full">
      {WEEKDAY_LABELS.map((label, index) => (
        <span key={index} title={WEEKDAY_NAMES[index]} className="text-center text-[10px] uppercase tracking-[.08em] text-text-muted">
          {label}
        </span>
      ))}
      {Array.from({ length: Math.max(0, leadingBlanks) }, (_, i) => (
        <span key={`blank-${i}`} aria-hidden="true" />
      ))}
      {days.map((day) => {
        const dayTransactions = transactions.filter(
          (t) => t.status !== "cancelada" && isSameCalendarDay(new Date(`${t.date}T00:00:00`), day),
        );
        const dayProjected = activeRecurring.filter((r) =>
          isSameCalendarDay(new Date(`${r.next_occurrence_date}T00:00:00`), day),
        );
        const hasOut = dayTransactions.some((t) => t.transaction_type === "saida");
        const hasIn = dayTransactions.some((t) => t.transaction_type === "entrada");
        const hasTransfer = dayTransactions.some((t) => t.transaction_type === "transferencia");
        const projectedOut = dayProjected.some((r) => r.transaction_type === "saida");
        const projectedIn = dayProjected.some((r) => r.transaction_type === "entrada");
        const selected = isSameCalendarDay(day, selectedDate);
        const isToday = isSameCalendarDay(day, today);

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            aria-pressed={selected}
            aria-label={`Dia ${day.getDate()}`}
            className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-[3px] font-mono text-[11px] cursor-pointer transition-colors ${
              selected
                ? "bg-[rgba(67,185,210,.12)] border-vex-cyan-dark text-vex-cyan-bright"
                : `bg-vex-obsidian border-border hover:border-text-muted ${isToday ? "text-vex-cyan-bright" : "text-text-secondary"}`
            }`}
          >
            <span className={isToday ? "font-semibold" : ""}>{day.getDate()}</span>
            <span className="flex gap-[3px] h-1 items-center">
              {hasOut && <Dot color="var(--color-error)" />}
              {hasIn && <Dot color="var(--color-success)" />}
              {hasTransfer && !hasOut && !hasIn && <Dot color="var(--color-text-muted)" />}
              {projectedOut && <Dot color="var(--color-error)" hollow />}
              {projectedIn && <Dot color="var(--color-success)" hollow />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Dot({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      className="w-1 h-1 rounded-full box-border"
      style={hollow ? { border: `1px solid ${color}` } : { background: color }}
    />
  );
}
