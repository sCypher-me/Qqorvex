import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Card, ConfirmDialog } from "@qqorvex/ui";
import { useHabits } from "../hooks/useHabits";
import {
  useAddHabitToRoutine,
  useCreateRoutine,
  useDeleteRoutine,
  useHabitLogsForDate,
  useLogHabitForDate,
  useRemoveHabitFromRoutine,
  useRoutineHabits,
  useRoutines,
} from "../hooks/useRoutines";
import type { HabitLogState, Routine } from "../types";

const LOG_OPTIONS: { state: HabitLogState; label: string }[] = [
  { state: "concluido", label: "Concluído" },
  { state: "parcial", label: "Parcial" },
  { state: "pulado", label: "Pulado" },
];

/** "Rotina agrupa hábitos para check-off em conjunto" (ex.: "Manhã" = Meditar + Ler + Exercício). */
export function RoutinesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const { routines, isLoading } = useRoutines(client);
  const { relations } = useRoutineHabits(client);
  const { habits } = useHabits(client);
  const { logs } = useHabitLogsForDate(client, today);
  const createRoutine = useCreateRoutine(client, userId);
  const deleteRoutine = useDeleteRoutine(client);
  const addHabitToRoutine = useAddHabitToRoutine(client);
  const removeHabitFromRoutine = useRemoveHabitFromRoutine(client);
  const logHabit = useLogHabitForDate(client, today);

  const [name, setName] = useState("");
  const habitsById = new Map(habits.map((h) => [h.id, h]));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createRoutine.mutate(trimmed);
    setName("");
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-text-primary">Rotinas</h2>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : routines.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma rotina criada ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              habitIds={relations.filter((r) => r.routine_id === routine.id).map((r) => r.habit_id)}
              habitsById={habitsById}
              availableHabits={habits.filter(
                (h) => !relations.some((r) => r.routine_id === routine.id && r.habit_id === h.id),
              )}
              logs={logs}
              onDelete={() => deleteRoutine.mutate(routine.id)}
              onAddHabit={(habitId) => addHabitToRoutine.mutate({ routineId: routine.id, habitId })}
              onRemoveHabit={(habitId) => removeHabitFromRoutine.mutate({ routineId: routine.id, habitId })}
              onLogHabit={(habitId, state) => logHabit.mutate({ habitId, state })}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da rotina (ex.: Manhã)"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <Button type="submit" variant="secondary">
          Criar rotina
        </Button>
      </form>
    </div>
  );
}

function RoutineCard({
  routine,
  habitIds,
  habitsById,
  availableHabits,
  logs,
  onDelete,
  onAddHabit,
  onRemoveHabit,
  onLogHabit,
}: {
  routine: Routine;
  habitIds: string[];
  habitsById: Map<string, { id: string; name: string }>;
  availableHabits: { id: string; name: string }[];
  logs: { habit_id: string; state: HabitLogState }[];
  onDelete: () => void;
  onAddHabit: (habitId: string) => void;
  onRemoveHabit: (habitId: string) => void;
  onLogHabit: (habitId: string, state: HabitLogState) => void;
}) {
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-text-primary">{routine.name}</p>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir rotina
        </Button>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={`Excluir a rotina "${routine.name}"?`}
          description="Essa ação não pode ser desfeita."
          onConfirm={() => {
            setConfirmOpen(false);
            onDelete();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>

      {habitIds.length === 0 ? (
        <p className="font-sans text-xs text-text-secondary-warm">Nenhum hábito nesta rotina ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habitIds.map((habitId) => {
            const habit = habitsById.get(habitId);
            if (!habit) return null;
            const todayLog = logs.find((log) => log.habit_id === habitId);

            return (
              <li key={habitId} className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-text-primary">{habit.name}</span>
                <div className="flex gap-1">
                  {LOG_OPTIONS.map((option) => (
                    <Button
                      key={option.state}
                      type="button"
                      variant={todayLog?.state === option.state ? "chip-accent" : "chip"}
                      onClick={() => onLogHabit(habitId, option.state)}
                    >
                      {option.label}
                    </Button>
                  ))}
                  <Button type="button" variant="chip" onClick={() => onRemoveHabit(habitId)}>
                    Remover
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {availableHabits.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Adicionar hábito...</option>
            {availableHabits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!selectedHabitId) return;
              onAddHabit(selectedHabitId);
              setSelectedHabitId("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}
    </Card>
  );
}
