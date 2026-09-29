import { useMemo, useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { billingLimitMessage } from "@qqorvex/database";
import {
  Button,
  ChipTabs,
  Notice,
  Modal,
  ProgressBar,
  PlusIcon,
  SectionTitle,
  Skeleton,
  SkeletonList,
} from "@qqorvex/ui";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoalStatus,
  useDeleteGoal,
  useHabits,
  useCreateHabit,
  useUpdateHabitStatus,
  useDeleteHabit,
  useHabitLogsForDate,
  GoalCard,
  NewGoalForm,
  HabitCard,
  NewHabitForm,
  RoutinesPanel,
} from "@qqorvex/module-metas-habitos";
import { supabase } from "../app/supabase";
import { localDateKey } from "@qqorvex/module-metas-habitos";

type PageView = "tudo" | "metas" | "habitos" | "rotinas";

const VIEW_OPTIONS: { value: PageView; label: string }[] = [
  { value: "tudo", label: "Visão geral" },
  { value: "metas", label: "Metas" },
  { value: "habitos", label: "Hábitos" },
  { value: "rotinas", label: "Rotinas" },
];

function todayKey() {
  return localDateKey();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function MetasHabitosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [view, setView] = useState<PageView>("tudo");

  const { goals, isLoading: goalsLoading, error: goalsError } = useGoals(supabase);
  const createGoal = useCreateGoal(supabase, userId);
  const updateGoalStatus = useUpdateGoalStatus(supabase);
  const deleteGoal = useDeleteGoal(supabase);

  const { habits, isLoading: habitsLoading, error: habitsError } = useHabits(supabase);
  const createHabit = useCreateHabit(supabase, userId);
  const updateHabitStatus = useUpdateHabitStatus(supabase);
  const deleteHabit = useDeleteHabit(supabase);
  const { logs: todayLogs } = useHabitLogsForDate(supabase, todayKey());

  const activeGoals = goals.filter((goal) => goal.status === "ativa");
  const activeHabits = habits.filter((habit) => habit.status === "ativo");
  const completedHabitsToday = todayLogs.filter(
    (log) => log.state === "concluido" && activeHabits.some((habit) => habit.id === log.habit_id),
  ).length;
  const habitProgress = activeHabits.length ? Math.round((completedHabitsToday / activeHabits.length) * 100) : 0;
  const completedGoals = goals.filter((goal) => goal.status === "concluida").length;
  const pausedItems =
    goals.filter((goal) => goal.status === "pausada").length + habits.filter((habit) => habit.status === "pausado").length;
  const isFirstRun = !goalsLoading && !habitsLoading && !goalsError && !habitsError && goals.length === 0 && habits.length === 0;

  const focusLabel = useMemo(() => {
    if (activeHabits.length === 0 && activeGoals.length === 0) return "Crie seu primeiro ponto de partida";
    if (activeHabits.length > 0 && completedHabitsToday === 0) return "Faça um check-in para começar";
    if (habitProgress === 100) return "Tudo certo por hoje";
    return `${activeHabits.length - completedHabitsToday} hábito${activeHabits.length - completedHabitsToday === 1 ? "" : "s"} ainda em aberto`;
  }, [activeGoals.length, activeHabits.length, completedHabitsToday, habitProgress]);

  const showGoals = view === "tudo" || view === "metas";
  const showHabits = view === "tudo" || view === "habitos";
  const showRoutines = view === "tudo" || view === "rotinas";

  return (
    <div className=" editorial-metas-page flex min-w-0 flex-col gap-6 pb-8">
      <section className="editorial-metas-header">
        <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-2xl">
            <span className="editorial-eyebrow">{greeting().toUpperCase()} / SEU RITMO</span>
            <h1 className="mt-4 font-display text-[clamp(34px,4vw,53px)] font-bold leading-none tracking-[-0.055em] text-fg">
              Metas &amp; Hábitos
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-3">
              Construa um ritmo que caiba na sua vida. Um passo por vez.
            </p>
          </div>

          {!isFirstRun && <div className="editorial-metas-focus min-w-0">
            <div className="flex items-baseline justify-between gap-5">
              <span className="editorial-eyebrow">HÁBITOS DE HOJE</span>
              <strong className="text-2xl font-bold text-fg">{habitProgress}%</strong>
            </div>
            <ProgressBar value={habitProgress} tone="cyan" height={5} aria-label={`${habitProgress}% dos hábitos concluídos hoje`} />
            <strong className="mt-3 block truncate text-sm font-semibold text-fg">{focusLabel}</strong>
            <span className="mt-1 block text-xs text-fg-3">
                {completedHabitsToday} de {activeHabits.length || 0} hábitos concluídos
            </span>
          </div>}
        </div>
      </section>

      {(goalsError || habitsError) && (
        <Notice tone="error" title="Não foi possível carregar tudo">
          Algumas informações de metas ou hábitos não chegaram. Atualize a página e tente novamente.
        </Notice>
      )}

      {(updateGoalStatus.error || updateHabitStatus.error) && (
        <Notice tone="error" title="Não foi possível atualizar o item">
          {billingLimitMessage(updateGoalStatus.error ?? updateHabitStatus.error) ?? "Tente novamente. Seus dados continuam salvos."}
        </Notice>
      )}

      {isFirstRun && (
        <section className="editorial-metas-start border-l-[3px] border-gold-line bg-surface px-5 py-6 sm:px-7 sm:py-7" aria-labelledby="metas-start-title">
          <span className="editorial-eyebrow">SEU PRIMEIRO PASSO</span>
          <h2 id="metas-start-title" className="mt-2 font-display text-xl font-semibold text-fg">Comece pelo que faz sentido hoje.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-2">Uma meta dá direção; um hábito ajuda a manter o ritmo. Escolha um para começar — você pode criar o outro depois.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button type="button" variant="primary" size="sm" onClick={() => setGoalModalOpen(true)}>
              <PlusIcon size={15} aria-hidden="true" /> Criar meta
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setHabitModalOpen(true)}>
              <PlusIcon size={15} aria-hidden="true" /> Criar hábito
            </Button>
          </div>
        </section>
      )}

      {!isFirstRun && <section className="editorial-metas-stats grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo de metas e hábitos">
        <MetricCard label="Metas ativas" value={activeGoals.length} detail={`${completedGoals} concluída${completedGoals === 1 ? "" : "s"}`} tone="gold" />
        <MetricCard label="Hábitos hoje" value={`${completedHabitsToday}/${activeHabits.length}`} detail={activeHabits.length ? "check-ins concluídos" : "nenhum hábito ativo"} tone="cyan" />
        <MetricCard label="Em andamento" value={activeGoals.length + activeHabits.length} detail="frentes ativas" tone="green" />
        <MetricCard label="Em pausa" value={pausedItems} detail="retome quando fizer sentido" tone="muted" />
      </section>}

      <div className="editorial-metas-toolbar flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="editorial-eyebrow">SEU PAINEL</span>
          <p className="mt-1 text-sm text-fg-2">Acompanhe o que merece sua atenção agora.</p>
        </div>
        <ChipTabs options={VIEW_OPTIONS} value={view} onChange={setView} className="editorial-task-tabs" />
      </div>

      {showGoals && (
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="goals-heading">
          <SectionTitle
            actions={goals.length > 0 ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setGoalModalOpen(true)}>
                <PlusIcon size={15} aria-hidden="true" /> Nova meta
              </Button>
            ) : undefined}
          >
            <span id="goals-heading">Metas</span>
          </SectionTitle>
          {goalsLoading ? (
            <div role="status" aria-label="Carregando metas" className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
          ) : goals.length === 0 ? (
            <ResourceEmptyState
              eyebrow="PRIMEIRO MOVIMENTO"
              title="Uma meta dá direção ao seu esforço."
              description="Defina um resultado claro para acompanhar o progresso, criar marcos e conectar hábitos que ajudam você a chegar lá."
              action="Criar minha primeira meta"
              onAction={() => setGoalModalOpen(true)}
            />
          ) : (
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-4">
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
      )}

      {showHabits && (
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="habits-heading">
          <SectionTitle
            meta={activeHabits.length ? `${completedHabitsToday}/${activeHabits.length} hoje` : undefined}
            actions={habits.length > 0 ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setHabitModalOpen(true)}>
                <PlusIcon size={15} aria-hidden="true" /> Novo hábito
              </Button>
            ) : undefined}
          >
            <span id="habits-heading">Hábitos</span>
          </SectionTitle>
          {habitsLoading ? (
            <div className="editorial-metas-habit-list overflow-hidden">
              <SkeletonList rows={3} />
            </div>
          ) : habits.length === 0 ? (
            <ResourceEmptyState
              eyebrow="RITMO CONSISTENTE"
              title="O hábito certo cabe no seu dia."
              description="Comece pequeno, registre o que aconteceu e use a sequência como informação — não como cobrança."
              action="Criar meu primeiro hábito"
              onAction={() => setHabitModalOpen(true)}
            />
          ) : (
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 overflow-hidden">
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
      )}

      {showRoutines && <RoutinesPanel client={supabase} userId={userId} />}

      <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Nova meta">
        <NewGoalForm
          onCreate={async (goal) => {
            await createGoal.mutateAsync(goal);
            setGoalModalOpen(false);
          }}
          onCancel={() => setGoalModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={habitModalOpen} onClose={() => setHabitModalOpen(false)} title="Novo hábito">
        <NewHabitForm
          onCreate={async (habit) => {
            await createHabit.mutateAsync(habit);
            setHabitModalOpen(false);
          }}
          onCancel={() => setHabitModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone: "gold" | "cyan" | "green" | "muted";
}) {
  const toneClass = {
    gold: "bg-gold",
    cyan: "bg-gold",
    green: "bg-success",
    muted: "bg-text-muted",
  }[tone];

  return (
    <div className="editorial-metas-stat min-w-0 p-4 sm:p-[18px]">
      <div className={`mb-3 h-[3px] w-6 rounded-full ${toneClass}`} />
      <span className="block truncate text-xs uppercase tracking-[0.1em] text-fg-3">{label}</span>
      <strong className="mt-1 block font-display text-[clamp(1.45rem,3vw,1.9rem)] font-semibold leading-none text-fg">{value}</strong>
      <span className="mt-2 block truncate text-xs text-fg-2">{detail}</span>
    </div>
  );
}

function ResourceEmptyState({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="editorial-metas-empty relative overflow-hidden border-l-[3px] border-gold-line bg-surface px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 max-w-2xl">
          <span className="editorial-eyebrow">{eyebrow}</span>
          <h3 className="mt-2 font-display text-lg font-semibold text-fg">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-2">{description}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="shrink-0 self-start sm:self-center" onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
}
