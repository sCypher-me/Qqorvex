import { useState } from "react";
import { CheckIcon, CircleHalfIcon, DotsThreeIcon, FireIcon, MinusIcon, PauseIcon, PlayIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Badge, ConfirmDialog, DropdownMenu, cx } from "@qqorvex/ui";
import { computeCurrentStreak, getHabitWeeklyTarget, shiftDateKey } from "../service";
import type { Habit, HabitFrequencyConfig, HabitLog, HabitLogState } from "../types";

const DAY_LABEL: Record<string, string> = { mon: "seg", tue: "ter", wed: "qua", thu: "qui", fri: "sex", sat: "sáb", sun: "dom", seg: "seg", ter: "ter", qua: "qua", qui: "qui", sex: "sex", sab: "sáb", dom: "dom" };
const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function cadenceLabel(habit: Habit): string {
  const config = (habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig;
  let label: string;
  switch (habit.frequency_type) {
    case "diaria":
      label = "Todos os dias";
      break;
    case "dias_especificos":
      label = config.days?.length ? config.days.map((day) => DAY_LABEL[day] ?? day).join(", ") : "Dias específicos";
      break;
    case "x_vezes_semana":
      label = config.timesPerWeek ? `${config.timesPerWeek}x por semana` : "Algumas vezes por semana";
      break;
    case "semanal":
      label = "Semanal";
      break;
    case "mensal":
      label = "Mensal";
      break;
    default:
      label = "Personalizado";
  }
  return habit.preferred_time ? `${label} · ${habit.preferred_time.slice(0, 5)}` : label;
}

const CELL: Record<HabitLogState | "vazio", string> = {
  concluido: "bg-gold border-gold",
  parcial: "bg-gold-soft border-gold-line",
  pulado: "border-line bg-[repeating-linear-gradient(135deg,var(--q-line)_0_2px,transparent_2px_5px)]",
  vazio: "border-line bg-transparent",
};

const STATE_LABEL: Record<HabitLogState, string> = { concluido: "feito", parcial: "parcial", pulado: "pulado" };

export interface HabitRowProps {
  habit: Habit;
  /** Registros deste hábito (ao menos os últimos 7 dias; mais dias alongam a sequência). */
  logs: HabitLog[];
  today: string;
  /** Hoje o hábito não está previsto (dia não marcado): aparece, mas sem destaque. */
  offSchedule?: boolean;
  busy?: boolean;
  onSetLog: (state: HabitLogState | null) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

/** Linha de hábito: marcar o dia com um toque, a semana, a sequência e a meta semanal. */
export function HabitRow({ habit, logs, today, offSchedule = false, busy = false, onSetLog, onToggleStatus, onDelete }: HabitRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const byDate = new Map(logs.map((log) => [log.log_date, log.state]));
  const todayState = byDate.get(today);
  const week = Array.from({ length: 7 }, (_, index) => shiftDateKey(today, index - 6));
  const doneThisWeek = week.filter((date) => byDate.get(date) === "concluido").length;
  const weeklyTarget = getHabitWeeklyTarget(habit);
  const [y = 0, m = 1, d = 1] = today.split("-").map(Number);
  const streak = computeCurrentStreak(logs, new Date(y, m - 1, d));
  const active = habit.status === "ativo";
  const done = todayState === "concluido";

  return (
    <li className={cx("group flex items-center gap-3 px-4 py-3", !active && "opacity-60")}>
      <button
        type="button"
        disabled={!active || busy}
        onClick={() => onSetLog(done ? null : "concluido")}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${habit.name} hoje` : `Marcar ${habit.name} como feito hoje`}
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] active:scale-95 disabled:cursor-not-allowed",
          done ? "border-gold bg-gold text-on-gold" : todayState === "parcial" ? "border-gold-line bg-gold-soft text-gold-fg" : todayState === "pulado" ? "border-line text-fg-4" : "border-line-strong text-transparent hover:border-gold-line hover:text-gold-fg/50",
        )}
      >
        {todayState === "parcial" ? <CircleHalfIcon size={16} weight="fill" /> : todayState === "pulado" ? <MinusIcon size={16} weight="bold" /> : <CheckIcon size={17} weight="bold" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cx("truncate text-[14px] font-medium", done ? "text-fg-3" : "text-fg")}>{habit.name}</p>
        <p className="truncate text-xs text-fg-3">
          {cadenceLabel(habit)}
          {habit.category ? ` · ${habit.category}` : ""}
          {offSchedule && active ? " · não previsto hoje" : ""}
        </p>
      </div>

      {!active && <Badge tone="neutral">Pausado</Badge>}

      <div className="hidden items-end gap-1 md:flex" aria-label={`Últimos 7 dias: ${doneThisWeek} feitos`}>
        {week.map((date) => {
          const state = byDate.get(date);
          const [yy = 0, mm = 1, dd = 1] = date.split("-").map(Number);
          const weekday = new Date(yy, mm - 1, dd).getDay();
          return (
            <span key={date} className="flex flex-col items-center gap-1" title={`${dd}/${mm}: ${state ? STATE_LABEL[state] : "sem registro"}`}>
              <span className={cx("h-4 w-4 rounded-[5px] border", CELL[state ?? "vazio"], date === today && "ring-1 ring-fg-3 ring-offset-1 ring-offset-surface")} />
              <span className={cx("text-[9px] leading-none", date === today ? "font-semibold text-fg-2" : "text-fg-4")}>{WEEKDAY_INITIAL[weekday]}</span>
            </span>
          );
        })}
      </div>

      <div className="flex w-[84px] shrink-0 flex-col items-end gap-0.5 text-right">
        <span className={cx("inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums", streak > 0 ? "text-fg" : "text-fg-4")} title="Sequência atual">
          <FireIcon size={14} weight={streak > 0 ? "fill" : "regular"} className={streak > 0 ? "text-[#e8804a]" : undefined} />
          {streak}
        </span>
        <span className="text-[11px] text-fg-4">{weeklyTarget ? `${doneThisWeek}/${weeklyTarget} na semana` : `${doneThisWeek} em 7 dias`}</span>
      </div>

      <DropdownMenu
        label={`Ações para ${habit.name}`}
        items={[
          ...(active
            ? [
                { label: "Feito hoje", icon: <CheckIcon />, onSelect: () => onSetLog("concluido"), checked: todayState === "concluido" },
                { label: "Parcial hoje", icon: <CircleHalfIcon />, onSelect: () => onSetLog("parcial"), checked: todayState === "parcial" },
                { label: "Pular hoje", icon: <MinusIcon />, onSelect: () => onSetLog("pulado"), checked: todayState === "pulado" },
                ...(todayState ? [{ label: "Limpar registro de hoje", icon: <XIcon />, onSelect: () => onSetLog(null) }] : []),
                "separator" as const,
              ]
            : []),
          active ? { label: "Pausar hábito", icon: <PauseIcon />, onSelect: onToggleStatus } : { label: "Retomar hábito", icon: <PlayIcon />, onSelect: onToggleStatus },
          { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setConfirmDelete(true) },
        ]}
        trigger={(props) => (
          <button type="button" {...props} aria-label={`Ações para ${habit.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100">
            <DotsThreeIcon size={18} weight="bold" />
          </button>
        )}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Excluir “${habit.name}”?`}
        description="O hábito e todo o histórico de registros serão apagados. Para parar por um tempo, pause."
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
      />
    </li>
  );
}
