import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CaretDownIcon, FireIcon, PlusIcon, TargetIcon, RepeatIcon } from "@phosphor-icons/react";
import { billingLimitMessage } from "@qqorvex/database";
import {
  GOAL_STATUS,
  GoalCard,
  GoalDetails,
  HabitRow,
  NewGoalForm,
  NewHabitForm,
  RoutinesPanel,
  computeHabitStreak,
  formatHabitStreak,
  habitStreakDays,
  habitScheduleOn,
  localDateKey,
  shiftDateKey,
  useCreateGoal,
  useCreateHabit,
  useDeleteGoal,
  useDeleteHabit,
  useGoals,
  useHabitLogsInRange,
  useHabits,
  useSetHabitLog,
  useUpdateGoalStatus,
  useUpdateHabitStatus,
  type Goal,
  type GoalStatus,
  type Habit,
  type HabitLog,
} from "@qqorvex/module-metas-habitos";
import { Badge, Button, ConfirmDialog, EmptyState, Modal, Notice, PageContainer, PageHeader, ProgressBar, ProgressRing, Segmented, Sheet, SkeletonList, Tabs, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type Tab = "hoje" | "habitos" | "metas" | "rotinas";
const TABS: Tab[] = ["hoje", "habitos", "metas", "rotinas"];
const HISTORY_DAYS = 84;

function dateOf(key: string): Date {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Mapa de calor de 12 semanas: cada quadrado é um dia, a cor mostra a fração de hábitos previstos que foram feitos. */
function ConsistencyHeatmap({ habits, logs, today }: { habits: Habit[]; logs: HabitLog[]; today: string }) {
  const done = new Map<string, number>();
  for (const log of logs) if (log.state === "concluido") done.set(log.log_date, (done.get(log.log_date) ?? 0) + 1);
  const active = habits.filter((habit) => habit.status === "ativo");
  const todayDate = dateOf(today);
  // Começa num domingo para as colunas serem semanas.
  const start = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - (HISTORY_DAYS - 1));
  start.setDate(start.getDate() - start.getDay());
  const days: Array<{ key: string; ratio: number | null; count: number; expected: number }> = [];
  for (let date = new Date(start); date <= todayDate; date.setDate(date.getDate() + 1)) {
    const key = localDateKey(date);
    const expected = active.filter((habit) => habitScheduleOn(habit, date) === "fixo").length;
    const count = done.get(key) ?? 0;
    days.push({ key, count, expected, ratio: expected ? Math.min(1, count / expected) : count ? 1 : null });
  }
  const weeks: (typeof days)[] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const perfect = days.filter((day) => day.expected > 0 && day.count >= day.expected).length;
  const last30 = days.slice(-30);
  const expected30 = last30.reduce((sum, day) => sum + day.expected, 0);
  const done30 = last30.reduce((sum, day) => sum + Math.min(day.count, day.expected), 0);
  const rate30 = expected30 ? Math.round((done30 / expected30) * 100) : null;

  const level = (ratio: number | null) => (ratio === null || ratio === 0 ? "bg-hover" : ratio < 0.34 ? "bg-gold/25" : ratio < 0.67 ? "bg-gold/50" : ratio < 1 ? "bg-gold/75" : "bg-gold");

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-8 sm:p-5">
      <div className="min-w-0">
        <h3 className="mb-3 text-[14px] font-semibold text-fg">Consistência · 12 semanas</h3>
        <div className="q-scroll-x">
          <div className="flex gap-1" role="img" aria-label={`Consistência dos hábitos nas últimas 12 semanas: ${perfect} dias completos`}>
            {weeks.map((week) => (
              <div key={week[0]!.key} className="flex flex-col gap-1">
                {week.map((day) => (
                  <span key={day.key} title={`${dateOf(day.key).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}: ${day.count}${day.expected ? ` de ${day.expected}` : ""}`} className={cx("h-4 w-4 rounded-[4px]", level(day.ratio), day.key === today && "ring-1 ring-fg-3")} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-fg-4">
          menos
          {["bg-hover", "bg-gold/25", "bg-gold/50", "bg-gold/75", "bg-gold"].map((tone) => (
            <span key={tone} className={cx("h-2.5 w-2.5 rounded-[2px]", tone)} />
          ))}
          mais
        </div>
      </div>
      <dl className="grid flex-1 grid-cols-3 gap-4 sm:border-l sm:border-line-soft sm:pl-8">
        {[
          ["Conclusão em 30 dias", rate30 === null ? "—" : `${rate30}%`],
          ["Dias completos", String(perfect)],
          ["Registros", String(total)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-fg-3">{label}</dt>
            <dd className="mt-1 font-display text-[26px] font-semibold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MetasHabitosPage() {
  const { userId } = useAccount();
  usePageMeta({ title: "Metas & Hábitos" });
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("aba") as Tab) ? (params.get("aba") as Tab) : "hoje";
  const setTab = (next: Tab) => setParams((current) => {
    const copy = new URLSearchParams(current);
    if (next === "hoje") copy.delete("aba");
    else copy.set("aba", next);
    return copy;
  }, { replace: true });

  const [habitModal, setHabitModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [goalFilter, setGoalFilter] = useState<"andamento" | "concluidas" | "todas">("andamento");
  const [openGoal, setOpenGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [showOthers, setShowOthers] = useState(false);

  const today = localDateKey();
  const { habits, isLoading: habitsLoading, error: habitsError } = useHabits(supabase);
  const { logs, isLoading: logsLoading } = useHabitLogsInRange(supabase, shiftDateKey(today, -(HISTORY_DAYS + 7)), today);
  const { goals, isLoading: goalsLoading, error: goalsError } = useGoals(supabase);
  const createHabit = useCreateHabit(supabase, userId ?? "");
  const createGoal = useCreateGoal(supabase, userId ?? "");
  const setLog = useSetHabitLog(supabase);
  const updateHabitStatus = useUpdateHabitStatus(supabase);
  const deleteHabit = useDeleteHabit(supabase);
  const updateGoalStatus = useUpdateGoalStatus(supabase);
  const deleteGoal = useDeleteGoal(supabase);

  const logsByHabit = useMemo(() => {
    const map = new Map<string, HabitLog[]>();
    for (const log of logs) map.set(log.habit_id, [...(map.get(log.habit_id) ?? []), log]);
    return map;
  }, [logs]);

  const todayDate = dateOf(today);
  const activeHabits = habits.filter((habit) => habit.status === "ativo");
  const dueToday = activeHabits.filter((habit) => habitScheduleOn(habit, todayDate) !== null);
  const notDueToday = activeHabits.filter((habit) => habitScheduleOn(habit, todayDate) === null);
  const doneToday = dueToday.filter((habit) => logsByHabit.get(habit.id)?.some((log) => log.log_date === today && log.state === "concluido")).length;
  const todayPercent = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;
  const bestStreak = activeHabits
    .map((habit) => ({ habit, streak: computeHabitStreak(habit, logsByHabit.get(habit.id) ?? [], todayDate) }))
    .sort((a, b) => habitStreakDays(b.streak) - habitStreakDays(a.streak))[0];
  const activeGoals = goals.filter((goal) => goal.status === "ativa");
  const visibleGoals = goals.filter((goal) => (goalFilter === "andamento" ? goal.status === "ativa" || goal.status === "planejada" || goal.status === "pausada" : goalFilter === "concluidas" ? goal.status === "concluida" || goal.status === "cancelada" : true));

  const setHabitLog = (habit: Habit, state: HabitLog["state"] | null) =>
    setLog.mutate({ habitId: habit.id, logDate: today, state }, { onError: () => toast({ title: "Não foi possível registrar", tone: "danger" }) });

  const habitRow = (habit: Habit, offSchedule = false) => (
    <HabitRow
      key={habit.id}
      habit={habit}
      logs={logsByHabit.get(habit.id) ?? []}
      today={today}
      offSchedule={offSchedule}
      busy={setLog.isPending}
      onSetLog={(state) => setHabitLog(habit, state)}
      onToggleStatus={() => updateHabitStatus.mutate({ habitId: habit.id, status: habit.status === "ativo" ? "pausado" : "ativo" })}
      onDelete={() => deleteHabit.mutate(habit.id, { onSuccess: () => toast({ title: "Hábito excluído", tone: "success" }) })}
    />
  );

  const loading = habitsLoading || logsLoading;
  const description = habitsLoading || goalsLoading ? "Carregando…" : [dueToday.length ? `${doneToday} de ${dueToday.length} hábitos feitos hoje` : "nenhum hábito previsto hoje", `${activeGoals.length} ${activeGoals.length === 1 ? "meta ativa" : "metas ativas"}`].join(" · ");

  return (
    <PageContainer>
      <PageHeader
        title="Metas & Hábitos"
        description={description}
        actions={
          <>
            <Button variant="secondary" leadingIcon={<TargetIcon size={16} />} onClick={() => setGoalModal(true)}>
              Nova meta
            </Button>
            <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setHabitModal(true)}>
              Novo hábito
            </Button>
          </>
        }
      >
        <Tabs<Tab>
          label="Seções"
          value={tab}
          onChange={setTab}
          options={[
            { value: "hoje", label: "Hoje" },
            { value: "habitos", label: "Hábitos", count: habits.length || null },
            { value: "metas", label: "Metas", count: goals.length || null },
            { value: "rotinas", label: "Rotinas" },
          ]}
        />
      </PageHeader>

      {(habitsError || goalsError) && <Notice title="Não foi possível carregar tudo">Atualize a página para tentar de novo.</Notice>}
      {(createGoal.error || createHabit.error) && <Notice>{billingLimitMessage(createGoal.error ?? createHabit.error) ?? "Não foi possível criar agora."}</Notice>}

      {tab === "hoje" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <h2 className="flex-1 text-[14px] font-semibold text-fg">Hábitos de hoje</h2>
                {dueToday.length > 0 && <span className="text-xs tabular-nums text-fg-3">{doneToday}/{dueToday.length}</span>}
              </header>
              {loading ? (
                <SkeletonList rows={4} leading />
              ) : activeHabits.length === 0 ? (
                <EmptyState
                  icon={<RepeatIcon />}
                  title="Nenhum hábito ainda"
                  description="Comece pequeno: algo que caiba em 2 minutos. Um toque por dia registra e a sequência mostra seu ritmo."
                  action={
                    <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setHabitModal(true)}>
                      Criar hábito
                    </Button>
                  }
                />
              ) : (
                <>
                  {dueToday.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-fg-3">Nada previsto para hoje. Aproveite o descanso.</p> : <ul className="divide-y divide-line-soft">{dueToday.map((habit) => habitRow(habit))}</ul>}
                  {notDueToday.length > 0 && (
                    <div className="border-t border-line">
                      <button type="button" onClick={() => setShowOthers((value) => !value)} aria-expanded={showOthers} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-fg-3 hover:bg-hover">
                        <CaretDownIcon size={12} className={cx("transition-transform", !showOthers && "-rotate-90")} />
                        Não previstos hoje ({notDueToday.length})
                      </button>
                      {showOthers && <ul className="divide-y divide-line-soft">{notDueToday.map((habit) => habitRow(habit, true))}</ul>}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
              <ProgressRing value={todayPercent} size={84} thickness={8} label="Hábitos de hoje">
                <span className="font-display text-[20px] font-semibold tabular-nums text-fg">{todayPercent}%</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-fg">{dueToday.length === 0 ? "Dia livre" : doneToday === dueToday.length ? "Dia completo!" : `Faltam ${dueToday.length - doneToday}`}</p>
                {bestStreak && bestStreak.streak.count > 0 ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-fg-3">
                    <FireIcon size={13} weight="fill" className="text-[#e8804a]" />
                    {bestStreak.habit.name}: {formatHabitStreak(bestStreak.streak)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-fg-3">Marque um hábito para começar uma sequência.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface">
              <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[14px] font-semibold text-fg">Metas em foco</h2>
                <button type="button" onClick={() => setTab("metas")} className="text-xs text-fg-3 hover:text-fg">
                  Ver todas
                </button>
              </header>
              {activeGoals.length === 0 ? (
                <div className="p-4">
                  <p className="text-[13px] text-fg-3">Nenhuma meta ativa.</p>
                  <Button size="sm" variant="secondary" className="mt-3" leadingIcon={<PlusIcon size={14} />} onClick={() => setGoalModal(true)}>
                    Criar meta
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {activeGoals.slice(0, 4).map((goal) => (
                    <li key={goal.id}>
                      <button type="button" onClick={() => setOpenGoal(goal)} className="flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-hover">
                        <span className="truncate text-[13.5px] font-medium text-fg">{goal.title}</span>
                        {goal.progress_type === "percentual_manual" && goal.progress_percent !== null ? <ProgressBar value={goal.progress_percent} height={4} label={goal.title} /> : goal.due_date ? <span className="text-xs text-fg-4">prazo {dateOf(goal.due_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      {tab === "habitos" && (
        <div className="flex flex-col gap-4">
          {habits.length > 0 && !loading && <ConsistencyHeatmap habits={habits} logs={logs} today={today} />}
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            {loading ? (
              <SkeletonList rows={4} leading />
            ) : habits.length === 0 ? (
              <EmptyState icon={<RepeatIcon />} title="Nenhum hábito ainda" description="Crie o primeiro hábito para acompanhar sequência e consistência." action={<Button onClick={() => setHabitModal(true)}>Criar hábito</Button>} />
            ) : (
              <ul className="divide-y divide-line-soft">{[...activeHabits, ...habits.filter((habit) => habit.status !== "ativo")].map((habit) => habitRow(habit, habit.status === "ativo" && habitScheduleOn(habit, todayDate) === null))}</ul>
            )}
          </section>
        </div>
      )}

      {tab === "metas" && (
        <div className="flex flex-col gap-4">
          <Segmented
            label="Filtrar metas"
            size="sm"
            value={goalFilter}
            onChange={setGoalFilter}
            className="self-start"
            options={[
              { value: "andamento", label: "Em andamento" },
              { value: "concluidas", label: "Encerradas" },
              { value: "todas", label: "Todas" },
            ]}
          />
          {goalsLoading ? (
            <SkeletonList rows={3} />
          ) : visibleGoals.length === 0 ? (
            <EmptyState
              icon={<TargetIcon />}
              title={goals.length === 0 ? "Nenhuma meta ainda" : "Nada neste filtro"}
              description={goals.length === 0 ? "Uma meta dá direção: um resultado com prazo, medido por marcos, por um valor guardado ou por percentual." : undefined}
              action={goals.length === 0 ? <Button onClick={() => setGoalModal(true)}>Criar meta</Button> : undefined}
            />
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {visibleGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  client={supabase}
                  goal={goal}
                  onOpen={() => setOpenGoal(goal)}
                  onChangeStatus={(status: GoalStatus) => updateGoalStatus.mutate({ goalId: goal.id, status }, { onSuccess: () => toast({ title: `Meta ${GOAL_STATUS[status].label.toLowerCase()}`, tone: "success" }) })}
                  onDelete={() => setDeletingGoal(goal)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "rotinas" && userId && <RoutinesPanel client={supabase} userId={userId} />}

      <Modal isOpen={habitModal} onClose={() => setHabitModal(false)} title="Novo hábito" size="md" icon={<RepeatIcon />}>
        <NewHabitForm
          onCancel={() => setHabitModal(false)}
          onCreate={async (habit) => {
            await createHabit.mutateAsync(habit);
            setHabitModal(false);
            toast({ title: "Hábito criado", description: habit.name, tone: "success" });
          }}
        />
      </Modal>
      <Modal isOpen={goalModal} onClose={() => setGoalModal(false)} title="Nova meta" size="md" icon={<TargetIcon />}>
        <NewGoalForm
          onCancel={() => setGoalModal(false)}
          onCreate={async (goal) => {
            await createGoal.mutateAsync(goal);
            setGoalModal(false);
            toast({ title: "Meta criada", description: goal.title, tone: "success" });
          }}
        />
      </Modal>

      {(() => {
        const current = openGoal ? goals.find((goal) => goal.id === openGoal.id) ?? openGoal : null;
        return (
          <Sheet isOpen={current !== null} onClose={() => setOpenGoal(null)} title={current?.title} description={current ? <Badge tone={GOAL_STATUS[current.status].tone}>{GOAL_STATUS[current.status].label}</Badge> : undefined} width={500}>
            {current && <GoalDetails client={supabase} goal={current} />}
          </Sheet>
        );
      })()}

      <ConfirmDialog
        isOpen={deletingGoal !== null}
        title="Excluir meta?"
        description={deletingGoal ? `“${deletingGoal.title}”, seus marcos e atualizações serão apagados.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setDeletingGoal(null)}
        onConfirm={() => {
          const target = deletingGoal;
          setDeletingGoal(null);
          if (target) deleteGoal.mutate(target.id, { onSuccess: () => toast({ title: "Meta excluída", tone: "success" }) });
        }}
      />
    </PageContainer>
  );
}
