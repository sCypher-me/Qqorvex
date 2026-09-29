import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BooksIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  MapPinIcon,
  NotebookIcon,
  PlusIcon,
  SparkleIcon,
  TargetIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { useHojeSummary } from "@qqorvex/module-hoje";
import {
  CompleteToggle,
  DueChip,
  PriorityFlag,
  SmartAdd,
  compareTasksForAction,
  localDateKey,
  addDaysToKey,
  useCreateTask,
  useAllTasks,
  useTasks,
  useUpdateTaskStatus,
  type NewTaskInput,
  type TaskWithConditions,
} from "@qqorvex/module-tarefas";
import { addDays, eventCategory, startOfDay, useEventsInRange, type CalendarEvent } from "@qqorvex/module-agenda";
import { computeCurrentStreak, getHabitWeeklyTarget, habitScheduleOn, useHabitLogsInRange, useHabits, useToggleHabitLog, type Habit } from "@qqorvex/module-metas-habitos";
import { useTransactions } from "@qqorvex/module-financas";
import { useLibraryItems } from "@qqorvex/module-biblioteca";
import { usePages } from "@qqorvex/module-segundo-cerebro";
import { BarChart, Button, ButtonLink, EmptyState, ExternalButtonLink, ProgressBar, Skeleton, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { useQuickCreate } from "../app/shell/QuickCreate";
import { MODULE_ROUTES } from "../app/shell/navigation";
import { supabase } from "../app/supabase";
import { useVexLauncher } from "../vex/VexLauncher";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function relativeMinutes(target: Date, now: Date): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h${String(rest).padStart(2, "0")}` : `em ${hours}h`;
}

function Panel({ title, icon, action, children, className }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("flex min-w-0 flex-col rounded-xl border border-line bg-surface", className)} aria-label={title}>
      <header className="flex items-center gap-2 px-4 pb-2 pt-3.5 sm:px-5">
        {icon && <span className="flex text-fg-4 [&_svg]:size-[17px]">{icon}</span>}
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        <span className="flex-1" />
        {action}
      </header>
      {children}
    </section>
  );
}

function MetricTile({ label, value, hint, icon, progress, to }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; progress?: number; to: string }) {
  return (
    <Link to={to} className="group flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg-3 [&_svg]:size-4">
        <span className="text-fg-4 group-hover:text-gold-fg">{icon}</span>
        {label}
      </div>
      <div className="min-w-0 truncate font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] text-fg">{value}</div>
      {progress !== undefined && <ProgressBar value={progress} height={4} />}
      {hint && <p className="truncate text-xs text-fg-3">{hint}</p>}
    </Link>
  );
}

export function HojeEditorialPage() {
  const { userId, firstName } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const quickCreate = useQuickCreate();
  const openVex = useVexLauncher();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = localDateKey(now);
  const { tasks, isLoading: tasksLoading } = useTasks(supabase, userId);
  const { tasks: allTasks } = useAllTasks(supabase);
  const createTask = useCreateTask(supabase, userId);
  const updateStatus = useUpdateTaskStatus(supabase);
  const { events, isLoading: eventsLoading } = useEventsInRange(supabase, startOfDay(now), addDays(startOfDay(now), 1));
  const { habits } = useHabits(supabase);
  const { logs: habitLogs } = useHabitLogsInRange(supabase, addDaysToKey(today, -60), today);
  const toggleHabit = useToggleHabitLog(supabase);
  const monthStart = `${today.slice(0, 8)}01`;
  const { transactions, isLoading: financeLoading } = useTransactions(supabase, monthStart);
  const { items: libraryItems } = useLibraryItems(supabase);
  const { pages } = usePages(supabase);
  const { summary } = useHojeSummary();

  /* ── Tarefas ── */
  const todayTasks = tasks.filter((task) => (task.status !== "concluido" && ((task.due_date !== null && task.due_date <= today) || task.status === "em_andamento")) || (task.status === "concluido" && task.completed_at && localDateKey(new Date(task.completed_at)) === today));
  const doneToday = todayTasks.filter((task) => task.status === "concluido").length;
  const focus = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "concluido" && ((task.due_date !== null && task.due_date <= today) || task.status === "em_andamento" || task.priority === "alta"))
        .sort((a, b) => Number(b.status === "em_andamento") - Number(a.status === "em_andamento") || compareTasksForAction(a, b))
        .slice(0, 7),
    [tasks, today],
  );

  function toggleTask(task: TaskWithConditions) {
    const next = task.status === "concluido" ? "nao_iniciado" : "concluido";
    updateStatus.mutate(
      { taskId: task.id, status: next },
      {
        onSuccess: () => {
          if (next === "concluido") toast({ title: "Tarefa concluída", description: task.title, tone: "success", action: { label: "Desfazer", onClick: () => updateStatus.mutate({ taskId: task.id, status: task.status }) } });
        },
      },
    );
  }

  async function addTodayTask(input: NewTaskInput) {
    await createTask.mutateAsync(input);
  }

  /* ── Agenda ── */
  const dayEvents = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const timedEvents = dayEvents.filter((event) => !event.is_all_day);
  const currentEvent = timedEvents.find((event) => new Date(event.start_at) <= now && new Date(event.end_at) > now) ?? null;
  const nextEvent = timedEvents.find((event) => new Date(event.start_at) > now) ?? null;

  /* ── Hábitos ── */
  const habitRows = habits
    .map((habit) => {
      const schedule = habitScheduleOn(habit, now);
      const logs = habitLogs.filter((log) => log.habit_id === habit.id);
      const doneTodayHabit = logs.some((log) => log.log_date === today && log.state === "concluido");
      const weekStart = addDaysToKey(today, -now.getDay());
      const weekCount = logs.filter((log) => log.log_date >= weekStart && log.state === "concluido").length;
      return { habit, schedule, done: doneTodayHabit, streak: computeCurrentStreak(logs, now), weekCount, weekTarget: getHabitWeeklyTarget(habit) };
    })
    .filter((row) => row.schedule !== null);
  const fixedHabits = habitRows.filter((row) => row.schedule === "fixo");
  const flexibleHabits = habitRows.filter((row) => row.schedule === "flexivel");
  const habitsDone = fixedHabits.filter((row) => row.done).length;

  /* ── Finanças ── */
  const monthIncome = transactions.filter((t) => t.transaction_type === "entrada" && t.status === "concluida").reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = transactions.filter((t) => t.transaction_type === "saida" && t.status === "concluida").reduce((sum, t) => sum + t.amount, 0);
  const monthBalance = monthIncome - monthExpense;

  /* ── Semana ── */
  const weekChart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const key = addDaysToKey(today, index - 6);
        const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const completed = allTasks.filter((task) => task.completed_at && localDateKey(new Date(task.completed_at)) === key).length;
        return { label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), fullLabel: date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }), values: { tarefas: completed } };
      }),
    [allTasks, today],
  );
  const weekTotal = weekChart.reduce((sum, day) => sum + (day.values.tarefas ?? 0), 0);

  /* ── Atenção (outros módulos) ── */
  const attention = summary.items.filter((item) => !["tarefas", "agenda", "metas-habitos"].includes(item.source) && item.id !== "financas-saldo").slice(0, 6);

  /* ── Continuar ── */
  const readingNow = libraryItems.find((item) => item.status === "em_andamento");
  const lastPage = [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  const summaryLine = tasksLoading || eventsLoading
    ? "Organizando seu dia…"
    : [
        timedEvents.length ? `${timedEvents.length} ${timedEvents.length === 1 ? "compromisso" : "compromissos"}` : "agenda livre",
        `${todayTasks.length - doneToday} ${todayTasks.length - doneToday === 1 ? "tarefa" : "tarefas"} para hoje`,
        fixedHabits.length ? `${fixedHabits.length - habitsDone} ${fixedHabits.length - habitsDone === 1 ? "hábito" : "hábitos"} a fazer` : null,
      ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg-3">{(() => { const label = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return label.charAt(0).toUpperCase() + label.slice(1); })()}</p>
          <h1 className="mt-1 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg sm:text-[34px]">
            {greetingFor(now)}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1.5 text-[14px] text-fg-3">{summaryLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ai"
            size="sm"
            leadingIcon={<SparkleIcon size={15} weight="fill" />}
            onClick={() => openVex("Monte um plano realista para o meu dia de hoje considerando minhas tarefas, prazos, compromissos e hábitos. Sugira a ordem e horários.")}
          >
            Planejar o dia com a Vex
          </Button>
          <Button size="sm" leadingIcon={<PlusIcon size={15} weight="bold" />} onClick={() => quickCreate.open("task", { date: today })}>
            Nova tarefa
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Tarefas de hoje"
          icon={<CheckCircleIcon />}
          value={tasksLoading ? <Skeleton className="h-6 w-16" /> : <span className="tabular-nums">{doneToday}<span className="text-fg-4">/{todayTasks.length}</span></span>}
          progress={todayTasks.length ? (doneToday / todayTasks.length) * 100 : 0}
          hint={todayTasks.length === 0 ? "Nada com prazo hoje" : doneToday === todayTasks.length ? "Tudo feito por hoje" : `${todayTasks.length - doneToday} restantes`}
          to="/planejar/tarefas"
        />
        <MetricTile
          label={currentEvent ? "Acontecendo agora" : "Próximo compromisso"}
          icon={<ClockIcon />}
          value={eventsLoading ? <Skeleton className="h-6 w-24" /> : currentEvent ? currentEvent.title : nextEvent ? fmtTime(nextEvent.start_at) : "—"}
          hint={currentEvent ? `até ${fmtTime(currentEvent.end_at)}` : nextEvent ? `${nextEvent.title} · ${relativeMinutes(new Date(nextEvent.start_at), now)}` : "Sem mais compromissos hoje"}
          to="/planejar/agenda"
        />
        <MetricTile
          label="Hábitos"
          icon={<TargetIcon />}
          value={<span className="tabular-nums">{habitsDone}<span className="text-fg-4">/{fixedHabits.length}</span></span>}
          progress={fixedHabits.length ? (habitsDone / fixedHabits.length) * 100 : 0}
          hint={fixedHabits.length === 0 ? "Nenhum previsto para hoje" : habitsDone === fixedHabits.length ? "Sequência mantida" : "Marque ao concluir"}
          to="/planejar/metas"
        />
        <MetricTile
          label="Resultado do mês"
          icon={<WalletIcon />}
          value={financeLoading ? <Skeleton className="h-6 w-24" /> : <span className={cx("tabular-nums", monthBalance < 0 && "text-danger")}>{money.format(monthBalance)}</span>}
          hint={`${money.format(monthIncome)} entraram · ${money.format(monthExpense)} saíram`}
          to="/vida/financas"
        />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Foco do dia" icon={<CheckCircleIcon />} action={<ButtonLink to="/planejar/tarefas" variant="ghost" size="xs" trailingIcon={<ArrowRightIcon size={12} />}>Todas</ButtonLink>}>
            <div className="px-4 pb-2 sm:px-5">
              <SmartAdd onCreate={addTodayTask} defaults={{ dueDate: today }} placeholder="Adicionar ao seu dia…" />
            </div>
            {tasksLoading ? (
              <div className="flex flex-col gap-2 px-5 py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : focus.length === 0 ? (
              <EmptyState size="sm" icon={<CheckCircleIcon />} title="Nada urgente por aqui" description="Sem tarefas atrasadas, para hoje ou de alta prioridade. Aproveite para planejar a semana." />
            ) : (
              <ul className="divide-y divide-line-soft pb-1">
                {focus.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover sm:px-5">
                    <CompleteToggle done={task.status === "concluido"} label={`Concluir ${task.title}`} onToggle={() => toggleTask(task)} disabled={task.isBlocked} />
                    <button type="button" onClick={() => navigate(`/planejar/tarefas?tarefa=${task.id}`)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[13.5px] text-fg">{task.title}</span>
                      {task.status === "em_andamento" && <span className="text-2xs font-medium text-gold-fg">Em andamento</span>}
                    </button>
                    <PriorityFlag priority={task.priority} />
                    {task.due_date && <DueChip dueDate={task.due_date} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Agenda de hoje" icon={<CalendarBlankIcon />} action={<ButtonLink to="/planejar/agenda" variant="ghost" size="xs" trailingIcon={<ArrowRightIcon size={12} />}>Abrir agenda</ButtonLink>}>
            {eventsLoading ? (
              <div className="flex flex-col gap-2 px-5 py-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : dayEvents.length === 0 ? (
              <EmptyState size="sm" icon={<CalendarBlankIcon />} title="Agenda livre" description="Nenhum compromisso hoje. Que tal reservar um bloco de foco?" action={<Button size="xs" variant="secondary" onClick={() => quickCreate.open("event")}>Adicionar evento</Button>} />
            ) : (
              <ol className="flex flex-col px-4 pb-3 sm:px-5">
                {dayEvents.map((event) => (
                  <TimelineItem key={event.id} event={event} now={now} isCurrent={event.id === currentEvent?.id} isNext={event.id === nextEvent?.id} />
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Hábitos de hoje" icon={<FireIcon />} action={<ButtonLink to="/planejar/metas" variant="ghost" size="xs" trailingIcon={<ArrowRightIcon size={12} />}>Metas</ButtonLink>}>
            {habitRows.length === 0 ? (
              <EmptyState size="sm" icon={<TargetIcon />} title="Nenhum hábito ativo" description="Pequenas rotinas diárias constroem grandes resultados." action={<ButtonLink to="/planejar/metas" size="xs" variant="secondary">Criar hábito</ButtonLink>} />
            ) : (
              <ul className="flex flex-col pb-2">
                {[...fixedHabits, ...flexibleHabits].map((row) => (
                  <HabitRow
                    key={row.habit.id}
                    habit={row.habit}
                    done={row.done}
                    streak={row.streak}
                    weekly={row.schedule === "flexivel" && row.weekTarget ? `${row.weekCount}/${row.weekTarget} na semana` : undefined}
                    onToggle={() => toggleHabit.mutate({ habitId: row.habit.id, logDate: today, done: !row.done })}
                  />
                ))}
              </ul>
            )}
          </Panel>

          {attention.length > 0 && (
            <Panel title="Pedem sua atenção" icon={<ClockIcon />}>
              <ul className="flex flex-col pb-2">
                {attention.map((item) => {
                  const route = MODULE_ROUTES[item.source];
                  return (
                    <li key={`${item.source}-${item.id}`}>
                      <Link to={route?.to ?? "/"} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-hover sm:px-5">
                        <span aria-hidden="true" className={cx("h-1.5 w-1.5 shrink-0 rounded-full", item.priority === "urgente" ? "bg-danger" : item.priority === "importante" ? "bg-warning" : "bg-gold")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-fg">{item.title}</span>
                          <span className="text-2xs text-fg-4">{route?.label ?? item.source}</span>
                        </span>
                        {item.time && <span className="shrink-0 text-2xs tabular-nums text-fg-4">{new Date(item.time.length === 10 ? `${item.time}T12:00:00` : item.time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          <Panel title="Sua semana" icon={<CheckCircleIcon />} action={<span className="text-xs tabular-nums text-fg-3">{weekTotal} {weekTotal === 1 ? "tarefa concluída" : "tarefas concluídas"}</span>}>
            <div className="px-3 pb-3 sm:px-4">
              <BarChart label="Tarefas concluídas por dia nos últimos 7 dias" data={weekChart} series={[{ key: "tarefas", label: "Tarefas concluídas" }]} height={150} highlightIndex={6} format={(value) => `${value}`} integer />
            </div>
          </Panel>

          {(readingNow || lastPage) && (
            <Panel title="Continue de onde parou">
              <div className="flex flex-col gap-1 px-2 pb-2">
                {lastPage && (
                  <Link to={`/conhecimento/notas/${lastPage.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-3"><NotebookIcon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{lastPage.title || "Sem título"}</span>
                      <span className="text-2xs text-fg-4">Última nota editada</span>
                    </span>
                  </Link>
                )}
                {readingNow && (
                  <Link to={`/conhecimento/biblioteca?item=${readingNow.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-hover text-fg-3">
                      {readingNow.cover_url ? <img src={readingNow.cover_url} alt="" className="h-full w-full object-cover" /> : <BooksIcon size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{readingNow.title}</span>
                      <span className="text-2xs text-fg-4">
                        {readingNow.progress_total ? `${readingNow.progress_current ?? 0} de ${readingNow.progress_total} ${readingNow.progress_unit ?? ""}` : "Em andamento"}
                      </span>
                    </span>
                    {readingNow.progress_total ? <span className="w-14"><ProgressBar value={((readingNow.progress_current ?? 0) / readingNow.progress_total) * 100} height={4} /></span> : null}
                  </Link>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ event, now, isCurrent, isNext }: { event: CalendarEvent; now: Date; isCurrent: boolean; isNext: boolean }) {
  const category = eventCategory(event.category);
  const past = !event.is_all_day && new Date(event.end_at) <= now;
  return (
    <li className={cx("relative grid grid-cols-[52px_14px_minmax(0,1fr)] gap-2.5 py-2", past && "opacity-55")}>
      <span className="pt-0.5 text-xs tabular-nums text-fg-3">{event.is_all_day ? "Dia" : fmtTime(event.start_at)}</span>
      <span className="relative flex justify-center">
        <span aria-hidden="true" className="absolute bottom-[-10px] top-4 w-px bg-line" />
        <span aria-hidden="true" className={cx("relative mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface", isCurrent ? "bg-gold" : "")} style={isCurrent ? undefined : { background: category.color }} />
      </span>
      <div className={cx("min-w-0 rounded-lg", (isCurrent || isNext) && "-my-1 border border-line bg-raised px-3 py-2")}>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-fg">{event.title}</p>
          {isCurrent && <span className="shrink-0 rounded-md bg-gold-soft px-1.5 py-0.5 text-2xs font-semibold text-gold-fg">Agora</span>}
          {isNext && !isCurrent && <span className="shrink-0 text-2xs font-medium text-fg-3">{relativeMinutes(new Date(event.start_at), now)}</span>}
        </div>
        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-fg-4">
          {!event.is_all_day && <span className="tabular-nums">{fmtTime(event.start_at)} – {fmtTime(event.end_at)}</span>}
          {event.location && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPinIcon size={11} /> {event.location}
            </span>
          )}
        </p>
        {event.meeting_link && (isCurrent || isNext) && (
          <ExternalButtonLink href={event.meeting_link} size="xs" variant="primary" className="mt-2" trailingIcon={<ArrowSquareOutIcon size={12} />}>
            Entrar na reunião
          </ExternalButtonLink>
        )}
      </div>
    </li>
  );
}

function HabitRow({ habit, done, streak, weekly, onToggle }: { habit: Habit; done: boolean; streak: number; weekly?: string; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-hover sm:px-5">
      <CompleteToggle done={done} label={done ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como feito`} onToggle={onToggle} />
      <span className="min-w-0 flex-1">
        <span className={cx("block truncate text-[13.5px]", done ? "text-fg-3" : "text-fg")}>{habit.name}</span>
        {(habit.preferred_time || weekly) && <span className="text-2xs text-fg-4">{[habit.preferred_time?.slice(0, 5), weekly].filter(Boolean).join(" · ")}</span>}
      </span>
      {streak > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-gold-fg" title={`${streak} dias seguidos`}>
          <FireIcon size={13} weight="fill" />
          {streak}
        </span>
      )}
    </li>
  );
}
