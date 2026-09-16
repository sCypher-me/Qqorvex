import { useState } from "react";
import { Card, Button, Badge, ConfirmDialog } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useHabitLogs, useLogHabit } from "../hooks/useHabits";
import { computeCurrentStreak } from "../service";
import type { Habit, HabitLogState } from "../types";

const LOG_OPTIONS: { state: HabitLogState; label: string }[] = [
  { state: "concluido", label: "Concluído" },
  { state: "parcial", label: "Parcial" },
  { state: "pulado", label: "Pulado" },
];

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
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find((log) => log.log_date === today);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold text-text-primary">{habit.name}</p>
          <div className="flex items-center gap-1.5">
            <Badge tone={habit.status === "ativo" ? "success" : "info"}>
              {habit.status === "ativo" ? "Ativo" : "Pausado"}
            </Badge>
            <span className="font-sans text-xs text-text-secondary-warm">
              Sequência atual: {streak} {streak === 1 ? "dia" : "dias"}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="chip" onClick={onPause}>
            {habit.status === "ativo" ? "Pausar" : "Retomar"}
          </Button>
          <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
            Excluir
          </Button>
        </div>
      </div>

      <div className="flex gap-1">
        {LOG_OPTIONS.map((option) => (
          <Button
            key={option.state}
            type="button"
            variant={todayLog?.state === option.state ? "chip-accent" : "chip"}
            onClick={() => logHabit.mutate({ logDate: today, state: option.state })}
          >
            {option.label}
          </Button>
        ))}
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
    </Card>
  );
}
