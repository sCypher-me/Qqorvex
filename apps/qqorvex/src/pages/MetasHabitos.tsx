import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, EmptyState, Modal, SectionTitle } from "@qqorvex/ui";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoalStatus,
  useDeleteGoal,
  useHabits,
  useCreateHabit,
  useUpdateHabitStatus,
  useDeleteHabit,
  GoalCard,
  NewGoalForm,
  HabitCard,
  NewHabitForm,
  RoutinesPanel,
} from "@qqorvex/module-metas-habitos";
import { supabase } from "../app/supabase";

export function MetasHabitosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  const { goals, isLoading: goalsLoading } = useGoals(supabase);
  const createGoal = useCreateGoal(supabase, userId);
  const updateGoalStatus = useUpdateGoalStatus(supabase);
  const deleteGoal = useDeleteGoal(supabase);

  const { habits, isLoading: habitsLoading } = useHabits(supabase);
  const createHabit = useCreateHabit(supabase, userId);
  const updateHabitStatus = useUpdateHabitStatus(supabase);
  const deleteHabit = useDeleteHabit(supabase);

  return (
    <div className="flex flex-col gap-[22px]">
      <section className="flex flex-col gap-3">
        <SectionTitle
          actions={
            <Button type="button" variant="primary" size="sm" onClick={() => setGoalModalOpen(true)}>
              Nova meta
            </Button>
          }
        >
          Metas
        </SectionTitle>
        {goalsLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : goals.length === 0 ? (
          <EmptyState>Nenhuma meta criada ainda. Use "Nova meta" para definir o primeiro resultado que você quer alcançar.</EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 items-start">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                client={supabase}
                goal={goal}
                onChangeStatus={(status) => updateGoalStatus.mutate({ goalId: goal.id, status })}
                onDelete={() => deleteGoal.mutate(goal.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle
          actions={
            <Button type="button" variant="primary" size="sm" onClick={() => setHabitModalOpen(true)}>
              Novo hábito
            </Button>
          }
        >
          Hábitos
        </SectionTitle>
        {habitsLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : habits.length === 0 ? (
          <EmptyState>Nenhum hábito criado ainda. Use "Novo hábito" para começar.</EmptyState>
        ) : (
          <div className="qv-card overflow-hidden flex flex-col">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                client={supabase}
                habit={habit}
                onPause={() =>
                  updateHabitStatus.mutate({
                    habitId: habit.id,
                    status: habit.status === "ativo" ? "pausado" : "ativo",
                  })
                }
                onDelete={() => deleteHabit.mutate(habit.id)}
              />
            ))}
          </div>
        )}
      </section>

      <RoutinesPanel client={supabase} userId={userId} />

      <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Nova meta">
        <NewGoalForm
          onCreate={(title) => {
            createGoal.mutate({ title });
            setGoalModalOpen(false);
          }}
          onCancel={() => setGoalModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={habitModalOpen} onClose={() => setHabitModalOpen(false)} title="Novo hábito">
        <NewHabitForm
          onCreate={(name) => {
            createHabit.mutate({ name });
            setHabitModalOpen(false);
          }}
          onCancel={() => setHabitModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
