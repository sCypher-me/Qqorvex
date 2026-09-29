import { useState } from "react";
import { Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useHabitLogs, useLogHabit } from "../hooks/useHabits";
import { computeCurrentStreak, getHabitWeeklyTarget, localDateKey, shiftDateKey } from "../service";
import type { Habit, HabitFrequencyConfig, HabitLogState, HabitStatus } from "../types";

const LOG_OPTIONS: { state: HabitLogState; label: string }[] = [
  { state: "concluido", label: "Concluído" },
  { state: "parcial", label: "Parcial" },
  { state: "pulado", label: "Pulado" },
];

const LOG_STATE_LABEL: Record<HabitLogState, string> = {
  concluido: "concluído",
  parcial: "parcial",
  pulado: "pulado",
};

const STATUS_LABEL: Record<HabitStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  arquivado: "Arquivado",
};

const STATUS_TONE: Record<HabitStatus, BadgeTone> = {
  ativo: "info",
  pausado: "neutral",
  arquivado: "outline",
};

const DAY_LABEL: Record<string, string> = {
  mon: "seg",
  tue: "ter",
  wed: "qua",
  thu: "qui",
  fri: "sex",
  sat: "sáb",
  sun: "dom",
};

function cadenceLabel(habit: Habit): string {
  const config = (habit.frequency_config ?? {}) as unknown as HabitFrequencyConfig;
  let label: string;
  switch (habit.frequency_type) {
    case "diaria":
      label = "todos os dias";
      break;
    case "dias_especificos":
      label = config.days?.length ? config.days.map((day) => DAY_LABEL[day] ?? day).join(", ") : "dias específicos";
      break;
    case "x_vezes_semana":
      label = config.timesPerWeek ? `${config.timesPerWeek}x por semana` : "algumas vezes por semana";
      break;
    case "semanal":
      label = "semanal";
      break;
    case "mensal":
      label = "mensal";
      break;
    default:
      label = "personalizada";
  }
  return habit.preferred_time ? `${label} · ${habit.preferred_time.slice(0, 5)}` : label;
}

/** Últimos 7 dias (terminando hoje), na mesma referência UTC usada para registrar o dia. */
function lastSevenDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(today, i - 6));
}

const WEEK_CELL: Record<HabitLogState | "vazio", string> = {
  concluido: "bg-vex-cyan border-vex-cyan-dark",
  parcial: "bg-chip-cyan border-vex-cyan-dark",
  pulado: "bg-transparent border-border",
  vazio: "bg-transparent border-border",
};

/** Linha de hábito (dentro do card-lista "Hábitos"): semana, sequência, status e registro do dia. */
export function HabitCard({
  client,
  habit,
  onPause,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  habit: Habit;
  onPause: () => void;
  onDelete: () => void;
}) {
  const { logs } = useHabitLogs(client, habit.id);
  const logHabit = useLogHabit(client, habit.id);
  const streak = computeCurrentStreak(logs, new Date());
  const today = localDateKey();
  const todayLog = logs.find((log) => log.log_date === today);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const logsByDate = new Map(logs.map((log) => [log.log_date, log.state]));
  const completedThisWeek = lastSevenDays(today).filter((date) => logsByDate.get(date) === "concluido").length;
  const weeklyTarget = getHabitWeeklyTarget(habit);

  return (
    <div className="qv-row flex items-center gap-x-4 gap-y-2.5 px-[18px] py-[14px] flex-wrap">
      <div className="flex-1 min-w-[160px] flex flex-col gap-[3px]">
        <span className="text-sm font-medium text-text-primary">{habit.name}</span>
        <span className="text-xs text-text-muted">
          {cadenceLabel(habit)}{habit.category ? ` · ${habit.category}` : ""}
        </span>
        {habit.description && <span className="mt-1 max-w-xl text-xs leading-relaxed text-text-secondary">{habit.description}</span>}
      </div>

      <div className="flex gap-1.5" aria-label={`Últimos 7 dias: ${completedThisWeek} concluídos`}>
        {lastSevenDays(today).map((date) => {
          const state = logsByDate.get(date);
          const [, month, day] = date.split("-");
          return (
            <span
              key={date}
              title={`${day}/${month}: ${state ? LOG_STATE_LABEL[state] : "sem registro"}`}
              className={`w-[18px] h-[18px] rounded-[6px] border ${WEEK_CELL[state ?? "vazio"]}`}
            />
          );
        })}
      </div>

      <span className="font-mono text-[13px] text-text-secondary w-[66px] text-right">
        {streak} {streak === 1 ? "dia" : "dias"}
      </span>
      <span className="font-mono text-[11px] text-text-muted">
        {habit.frequency_type === "mensal"
          ? `${logs.filter((log) => log.state === "concluido" && log.log_date >= shiftDateKey(today, -29)).length} nos últimos 30 dias`
          : weeklyTarget === null
            ? `${completedThisWeek} na semana`
            : `${completedThisWeek}/${weeklyTarget} na semana`}
      </span>

      <Badge tone={STATUS_TONE[habit.status]}>{STATUS_LABEL[habit.status]}</Badge>

      <div className="flex items-center gap-1.5 flex-wrap">
        {LOG_OPTIONS.map((option) => (
          <Button
            key={option.state}
            type="button"
            variant={todayLog?.state === option.state ? "vex" : "quiet"}
            size="xs"
            aria-pressed={todayLog?.state === option.state}
            disabled={habit.status !== "ativo" || logHabit.isPending}
            onClick={() => logHabit.mutate({ logDate: today, state: option.state })}
          >
            {option.label}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="xs" onClick={onPause}>
          {habit.status === "ativo" ? "Pausar" : habit.status === "arquivado" ? "Reativar" : "Retomar"}
        </Button>
        <button
          type="button"
          className="qv-icon-btn"
          aria-label={`Excluir "${habit.name}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${habit.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
