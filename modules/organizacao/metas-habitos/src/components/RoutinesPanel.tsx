import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, EmptyState } from "@qqorvex/ui";
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
    <div className="qv-card p-[18px] flex flex-col gap-3">
      <span className="font-display text-base font-semibold">Rotinas</span>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : routines.length === 0 ? (
        <EmptyState>Nenhuma rotina criada ainda.</EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
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

      <form onSubmit={handleSubmit} className="flex gap-2.5 flex-wrap pt-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da rotina (ex.: Manhã)"
          aria-label="Nome da rotina"
          className="qv-field flex-1 min-w-[200px] py-2.5"
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
  const routineHabits = habitIds.map((id) => habitsById.get(id)).filter((h): h is { id: string; name: string } => !!h);
  const doneToday = routineHabits.filter((h) => logs.some((log) => log.habit_id === h.id && log.state === "concluido")).length;

  return (
    <div className="qv-well p-[14px] flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-primary">{routine.name}</span>
          <span className="font-mono text-xs text-text-secondary">
            {routineHabits.length > 0 ? `${doneToday}/${routineHabits.length} hoje` : "0 hábitos"}
          </span>
        </div>
        <button
          type="button"
          className="qv-icon-btn"
          aria-label={`Excluir a rotina "${routine.name}"`}
          title="Excluir rotina"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>

      {routineHabits.length === 0 ? (
        <span className="text-xs text-text-muted">Nenhum hábito nesta rotina ainda.</span>
      ) : (
        <ul className="flex flex-col mt-1.5">
            {routineHabits.map((habit) => {
              const todayLog = logs.find((log) => log.habit_id === habit.id);
              return (
                <li key={habit.id} className="qv-row-top flex flex-col gap-1.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-primary flex-1 min-w-0">{habit.name}</span>
                    <Button type="button" variant="ghost" size="xs" onClick={() => onRemoveHabit(habit.id)}>
                      Remover
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {LOG_OPTIONS.map((option) => (
                      <Button
                        key={option.state}
                        type="button"
                        variant={todayLog?.state === option.state ? "vex" : "quiet"}
                        size="xs"
                        aria-pressed={todayLog?.state === option.state}
                        onClick={() => onLogHabit(habit.id, option.state)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
      )}

      {availableHabits.length > 0 && (
        <div className="flex gap-2 pt-1.5">
          <select
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            aria-label="Adicionar hábito à rotina"
            className="qv-field flex-1 py-[7px] px-2.5 text-[13px]"
          >
            <option value="">Adicionar hábito...</option>
            {availableHabits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
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
  );
}
