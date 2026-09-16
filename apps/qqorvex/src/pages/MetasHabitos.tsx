import { useAuth } from "@qqorvex/auth";
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

  const { goals, isLoading: goalsLoading } = useGoals(supabase);
  const createGoal = useCreateGoal(supabase, userId);
  const updateGoalStatus = useUpdateGoalStatus(supabase);
  const deleteGoal = useDeleteGoal(supabase);

  const { habits, isLoading: habitsLoading } = useHabits(supabase);
  const createHabit = useCreateHabit(supabase, userId);
  const updateHabitStatus = useUpdateHabitStatus(supabase);
  const deleteHabit = useDeleteHabit(supabase);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-8">
      <div className="w-full max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Metas & Hábitos</h1>
      </div>

      <section className="w-full max-w-3xl flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">Metas</h2>
        <NewGoalForm onCreate={(title) => createGoal.mutate({ title })} />
        {goalsLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-2">
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

      <section className="w-full max-w-3xl flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">Hábitos</h2>
        <NewHabitForm onCreate={(name) => createHabit.mutate({ name })} />
        {habitsLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-2">
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

      <section className="w-full max-w-3xl">
        <RoutinesPanel client={supabase} userId={userId} />
      </section>
    </main>
  );
}
