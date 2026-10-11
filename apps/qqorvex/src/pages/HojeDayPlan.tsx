import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRightIcon, CalendarBlankIcon, CoffeeIcon, MoonStarsIcon, PencilSimpleIcon, RoadHorizonIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import {
  buildDayPlan,
  defaultTaskMinutes,
  formatPlanMinutes,
  isClosingTime,
  isFlexibleEvent,
  normalizeDayWindow,
  proposeReorganization,
  validateDayWindow,
  type ReorgChange,
  type DayPlan,
  type DayWindow,
  type PlanEntry,
} from "@qqorvex/module-hoje";
import { addDaysToKey, planEstimateFor, selectDayPlanTasks, useUpdateTask, type Task, type TaskWithConditions } from "@qqorvex/module-tarefas";
import { useRescheduleEvent, type CalendarEvent } from "@qqorvex/module-agenda";
import { Button, Checkbox, Notice, cx, useToast } from "@qqorvex/ui";
import { supabase } from "../app/supabase";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const CLOSE_DAY_DISMISSED_KEY = "qqorvex.hoje.close-day.dismissed";

function fmtClock(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function readPreferences(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const saved = metadata?.qqorvex_preferences;
  return saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
}

export function useDayWindow() {
  const { session } = useAuth();
  const dayWindow = normalizeDayWindow(readPreferences(session?.user.user_metadata).day_window);
  const save = async (next: DayWindow) => {
    const current = readPreferences(session?.user.user_metadata);
    const { error } = await supabase.auth.updateUser({ data: { qqorvex_preferences: { ...current, day_window: next } } });
    if (error) throw error;
  };
  return { dayWindow, save };
}

interface DayPlanPanelProps {
  now: Date;
  today: string;
  tasks: TaskWithConditions[];
  allTasks: Task[];
  events: CalendarEvent[];
  loading: boolean;
}

export function DayPlanPanel({ now, today, tasks, allTasks, events, loading }: DayPlanPanelProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const updateTask = useUpdateTask(supabase);
  const rescheduleEvent = useRescheduleEvent(supabase);
  const { dayWindow, save } = useDayWindow();
  const [editingWindow, setEditingWindow] = useState(false);
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);

  const location = useLocation();
  // Aviso push de prazo em risco abre "/#plano-do-dia": rola até o painel quando ele terminar de carregar.
  useEffect(() => {
    if (location.hash !== "#plano-do-dia" || loading) return;
    document.getElementById("plano-do-dia")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, loading]);

  const candidates = useMemo(() => selectDayPlanTasks(tasks, today), [tasks, today]);
  const fallbackMinutes = useMemo(() => defaultTaskMinutes(allTasks.map((task) => task.estimated_minutes ?? 0)), [allTasks]);
  const planTasks = useMemo(
    () =>
      candidates.map((task) => ({
        id: task.id,
        title: task.title,
        estimatedMinutes: task.estimated_minutes,
        estimate: planEstimateFor(task, allTasks),
        mustFinishToday: task.due_date !== null && task.due_date <= today,
        dueDate: task.due_date,
      })),
    [allTasks, candidates, today],
  );
  const planEvents = useMemo(
    () =>
      events
        .filter((event) => !event.is_all_day)
        .map((event) => ({ id: event.id, title: event.title, start: new Date(event.start_at), end: new Date(event.end_at), flexible: isFlexibleEvent(event) })),
    [events],
  );
  const plan = useMemo(
    () => buildDayPlan({ now, window: dayWindow, defaultMinutes: fallbackMinutes, tasks: planTasks, events: planEvents }),
    [dayWindow, fallbackMinutes, now, planEvents, planTasks],
  );
  // Proposta de reorganização: só é aplicada quando a pessoa confirma.
  const reorganization = useMemo(
    () => proposeReorganization({ now, window: dayWindow, tomorrow: addDaysToKey(today, 1), tasks: planTasks, events: planEvents, defaultMinutes: fallbackMinutes }),
    [dayWindow, fallbackMinutes, now, planEvents, planTasks, today],
  );
  const selected = reorganization.changes.filter((change) => !deselected.has(changeKey(change)));

  function setDuration(taskId: string, minutes: number) {
    updateTask.mutate(
      { taskId, updates: { estimatedMinutes: minutes } },
      {
        onSuccess: () => toast({ title: "Duração atualizada", description: `${formatPlanMinutes(minutes)} — o plano já se ajustou.`, tone: "success" }),
        onError: () => toast({ title: "Não foi possível salvar a duração", tone: "danger" }),
      },
    );
  }

  /** Aplica as mudanças marcadas (prazos e horários) de uma vez e oferece desfazer todas. */
  async function applyReorganization() {
    setMoving(true);
    try {
      const results = await Promise.allSettled(
        selected.map((change) =>
          change.kind === "task_due"
            ? updateTask.mutateAsync({ taskId: change.id, updates: { dueDate: change.to } })
            : rescheduleEvent.mutateAsync({ eventId: change.id, startAt: change.to.start.toISOString(), endAt: change.to.end.toISOString() }),
        ),
      );
      const applied = selected.filter((_, index) => results[index]!.status === "fulfilled");
      const failed = selected.length - applied.length;
      setDeselected(new Set());
      toast({
        title: applied.length === 1 ? "1 mudança aplicada" : `${applied.length} mudanças aplicadas`,
        description: failed ? `${failed} não pôde ser aplicada; tente de novo.` : "O plano de hoje foi refeito.",
        tone: failed ? "info" : "success",
        action: applied.length
          ? {
              label: "Desfazer",
              onClick: () =>
                applied.forEach((change) => {
                  if (change.kind === "task_due") updateTask.mutate({ taskId: change.id, updates: { dueDate: change.from } });
                  else rescheduleEvent.mutate({ eventId: change.id, startAt: change.from.start.toISOString(), endAt: change.from.end.toISOString() });
                }),
            }
          : undefined,
      });
    } finally {
      setMoving(false);
    }
  }

  function toggleChange(change: ReorgChange) {
    setDeselected((current) => {
      const next = new Set(current);
      const key = changeKey(change);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const showReorganization = reorganization.changes.length > 0 || reorganization.unresolvedConflicts.length > 0;
  const fixesDay = reorganization.planAfter.status === "cabe" || reorganization.planAfter.status === "sem_tarefas";

  return (
    <section id="plano-do-dia" className="flex min-w-0 flex-col rounded-xl border border-line bg-surface" aria-label="Plano do dia">
      <header className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-3.5 sm:px-5">
        <span className="flex text-fg-4 [&_svg]:size-[17px]"><RoadHorizonIcon /></span>
        <h2 className="text-[14px] font-semibold text-fg">Plano do dia</h2>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setEditingWindow((value) => !value)}
          aria-expanded={editingWindow}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs tabular-nums text-fg-3 transition-colors hover:bg-hover hover:text-fg"
        >
          Disponível {dayWindow.start}–{dayWindow.end}
          <PencilSimpleIcon size={12} />
        </button>
      </header>

      {editingWindow && <WindowEditor initial={dayWindow} onCancel={() => setEditingWindow(false)} onSave={async (next) => { await save(next); setEditingWindow(false); toast({ title: "Horário disponível atualizado", description: `${next.start}–${next.end}`, tone: "success" }); }} />}

      <div className="px-4 pb-1 sm:px-5">
        <PlanSummary plan={plan} loading={loading} />
      </div>

      {showReorganization && (
        <div className="px-4 pt-2 sm:px-5">
          <Notice
            tone="warning"
            title={
              plan.status === "encerrado"
                ? "Ficaram tarefas com prazo de hoje"
                : plan.status === "nao_cabe"
                  ? `O dia não fecha: faltam ${formatPlanMinutes(plan.shortfallMinutes)}`
                  : "Conflito na agenda"
            }
            actions={
              reorganization.changes.length > 0 ? (
                <Button size="xs" onClick={() => void applyReorganization()} disabled={selected.length === 0} loading={moving}>
                  {selected.length === 1 ? "Aplicar 1 mudança" : `Aplicar ${selected.length} mudanças`}
                </Button>
              ) : undefined
            }
          >
            {reorganization.changes.length > 0 && (
              <>
                <p>
                  Proposta para reorganizar o dia. Nada muda até você confirmar; desmarque o que quiser manter como está.
                  {fixesDay && plan.status !== "encerrado" ? " Com todas as mudanças, o dia fecha." : ""}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {reorganization.changes.map((change) => (
                    <li key={changeKey(change)}>
                      <Checkbox size="sm" checked={!deselected.has(changeKey(change))} onChange={() => toggleChange(change)} label={<ChangeLabel change={change} today={today} />} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {reorganization.unresolvedConflicts.length > 0 && (
              <ul className={cx("flex flex-col gap-1", reorganization.changes.length > 0 && "mt-2")}>
                {reorganization.unresolvedConflicts.map(({ first, second, start }) => (
                  <li key={`${first.id}-${second.id}`} className="text-[13px]">
                    “{first.title}” e “{second.title}” se sobrepõem às {fmtClock(start)}. Como não são blocos só seus, ajuste na{" "}
                    <button type="button" onClick={() => navigate("/planejar/agenda")} className="font-medium text-gold-fg hover:underline">
                      Agenda
                    </button>
                    .
                  </li>
                ))}
              </ul>
            )}
          </Notice>
        </div>
      )}

      {plan.entries.length > 0 && (
        <ol className="flex flex-col px-4 pb-3 pt-2 sm:px-5" aria-label="Sequência sugerida">
          {plan.entries.map((entry, index) => (
            <PlanRow
              key={`${entry.kind}-${"id" in entry ? entry.id : "pausa"}-${index}`}
              entry={entry}
              now={now}
              onOpenTask={(id) => navigate(`/planejar/tarefas?tarefa=${id}`)}
              onDuration={setDuration}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function changeKey(change: ReorgChange): string {
  return `${change.kind}:${change.id}`;
}

function ChangeLabel({ change, today }: { change: ReorgChange; today: string }) {
  if (change.kind === "task_due") {
    return (
      <span className="text-[13px] text-fg">
        {change.title} <span className="text-fg-4">· prazo {change.from && change.from < today ? "atrasado" : "de hoje"} → amanhã</span>
      </span>
    );
  }
  const sameDay = change.to.start.toDateString() === change.from.start.toDateString();
  return (
    <span className="text-[13px] text-fg">
      {change.title}{" "}
      <span className="text-fg-4">
        · {fmtClock(change.from.start)} → {sameDay ? fmtClock(change.to.start) : `amanhã às ${fmtClock(change.to.start)}`}
        {change.reason === "conflito" ? " · resolve conflito" : " · libera tempo hoje"}
      </span>
    </span>
  );
}

function PlanSummary({ plan, loading }: { plan: DayPlan; loading: boolean }) {
  if (loading) return <p className="text-[13px] text-fg-3">Montando o plano…</p>;
  const reserve = Math.round(plan.freeMinutes * 0.2);
  switch (plan.status) {
    case "encerrado":
      return <p className="text-[13px] text-fg-3">Seu horário disponível de hoje terminou às {fmtClock(plan.windowEnd)}. O que ficou aberto continua nas suas tarefas.</p>;
    case "sem_tarefas":
      return <p className="text-[13px] text-fg-3">Nenhuma tarefa com prazo para hoje. Você tem {formatPlanMinutes(plan.freeMinutes)} livres até {fmtClock(plan.windowEnd)}.</p>;
    case "cabe":
      return (
        <p className="text-[13px] text-fg-2">
          {plan.overflow.length ? "Tudo o que vence hoje cabe" : "Tudo cabe"}: {formatPlanMinutes(plan.plannedMinutes)} de tarefas, terminando por volta de <strong className="font-semibold text-fg">{plan.finishesAt ? fmtClock(plan.finishesAt) : "—"}</strong>, com pausas e {formatPlanMinutes(reserve)} de folga para imprevistos.
        </p>
      );
    case "nao_cabe":
      return <p className="text-[13px] text-fg-2">Cabem {formatPlanMinutes(plan.plannedMinutes)} de tarefas nos {formatPlanMinutes(plan.freeMinutes)} livres, contando pausas e folga.</p>;
  }
}

function PlanRow({ entry, now, onOpenTask, onDuration }: { entry: PlanEntry; now: Date; onOpenTask: (id: string) => void; onDuration: (id: string, minutes: number) => void }) {
  const past = entry.end <= now;
  if (entry.kind === "pause") {
    return (
      <li className={cx("grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2.5 py-1 text-2xs text-fg-4", past && "opacity-55")}>
        <span className="tabular-nums">{fmtClock(entry.start)}</span>
        <span className="inline-flex items-center gap-1.5"><CoffeeIcon size={12} /> Pausa · {formatPlanMinutes(Math.round((entry.end.getTime() - entry.start.getTime()) / 60_000))}</span>
      </li>
    );
  }
  if (entry.kind === "event") {
    return (
      <li className={cx("grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2.5 py-1.5", past && "opacity-55")}>
        <span className="text-xs tabular-nums text-fg-3">{fmtClock(entry.start)}–{fmtClock(entry.end)}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-3">
          <CalendarBlankIcon size={13} className="shrink-0" />
          <span className="truncate">{entry.title}</span>
        </span>
      </li>
    );
  }
  const options = DURATION_OPTIONS.includes(entry.minutes) || entry.part ? DURATION_OPTIONS : [...DURATION_OPTIONS, entry.minutes].sort((a, b) => a - b);
  return (
    <li className={cx("grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2.5 py-1.5", past && "opacity-55")}>
      <span className="text-xs tabular-nums text-fg-2">{fmtClock(entry.start)}–{fmtClock(entry.end)}</span>
      <span className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => onOpenTask(entry.id)} className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-[13.5px] font-medium text-fg hover:text-gold-fg">{entry.title}</span>
          {entry.part && <span className="text-2xs text-fg-4">parte {entry.part.index} de {entry.part.total}</span>}
        </button>
        {entry.part ? (
          <span className="shrink-0 text-2xs tabular-nums text-fg-4">{formatPlanMinutes(entry.minutes)}</span>
        ) : (
          <label className="flex shrink-0 items-center gap-1 text-2xs text-fg-4">
            {entry.estimated && entry.confidence === "baixa" ? (
              <span className="font-medium text-gold-fg" title="Não deu para estimar pela tarefa nem pelo seu histórico. Escolha a duração para o plano ficar certo.">Quanto tempo leva?</span>
            ) : entry.estimated ? (
              <span title={`Estimado ${entry.note ?? "pelo seu histórico"}. Ajuste se não for isso — a correção ensina as próximas estimativas.`}>estimado</span>
            ) : null}
            <span className="sr-only">Duração de {entry.title}</span>
            <select
              value={entry.minutes}
              onChange={(event) => onDuration(entry.id, Number(event.target.value))}
              className={cx("q-input h-7 rounded-md px-1.5 text-2xs tabular-nums", entry.estimated && "border-dashed", entry.estimated && entry.confidence === "baixa" && "border-gold-line")}
              data-size="sm"
            >
              {options.map((minutes) => (
                <option key={minutes} value={minutes}>{entry.estimated && minutes === entry.minutes ? "~" : ""}{formatPlanMinutes(minutes)}</option>
              ))}
            </select>
          </label>
        )}
      </span>
    </li>
  );
}

function WindowEditor({ initial, onSave, onCancel }: { initial: DayWindow; onSave: (next: DayWindow) => Promise<void>; onCancel: () => void }) {
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = { start, end };
    const invalid = validateDayWindow(next);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
    } catch {
      setError("Não foi possível salvar agora. Confira a conexão e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-4 mb-2 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-raised p-3 sm:mx-5">
      <label className="flex flex-col gap-1 text-2xs font-medium text-fg-3">
        Começo
        <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="q-input h-8 rounded-md px-2 text-[13px] tabular-nums" required />
      </label>
      <label className="flex flex-col gap-1 text-2xs font-medium text-fg-3">
        Fim
        <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="q-input h-8 rounded-md px-2 text-[13px] tabular-nums" required />
      </label>
      <div className="flex gap-2">
        <Button size="xs" type="submit" loading={saving}>Salvar</Button>
        <Button size="xs" variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
      </div>
      <p className="basis-full text-2xs text-fg-4">O plano usa só esse horário e guarda 20% dele para pausas e imprevistos.</p>
      {error && <p role="alert" className="basis-full text-xs text-danger">{error}</p>}
    </form>
  );
}

/** Convite único e opcional para fechar o dia, na última hora da janela. Não move nada sozinho. */
export function CloseDayCard({ now, today, doneCount, openCount }: { now: Date; today: string; doneCount: number; openCount: number }) {
  const { dayWindow } = useDayWindow();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(CLOSE_DAY_DISMISSED_KEY) === today;
    } catch {
      return false;
    }
  });
  if (dismissed || !isClosingTime(now, dayWindow)) return null;

  function dismiss() {
    try {
      localStorage.setItem(CLOSE_DAY_DISMISSED_KEY, today);
    } catch {
      /* só não lembra a dispensa */
    }
    setDismissed(true);
  }

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3.5 sm:px-5" aria-label="Fechar o dia">
      <div className="flex items-center gap-2">
        <MoonStarsIcon size={17} className="text-fg-4" />
        <h2 className="text-[14px] font-semibold text-fg">Fechar o dia</h2>
      </div>
      <p className="text-[13px] leading-relaxed text-fg-2">
        {openCount === 0
          ? `Você concluiu ${doneCount === 1 ? "1 tarefa" : `${doneCount} tarefas`} hoje e não ficou nada pendente. Bom descanso.`
          : `Você concluiu ${doneCount === 1 ? "1 tarefa" : `${doneCount} tarefas`} hoje e ${openCount === 1 ? "1 ficou pendente" : `${openCount} ficaram pendentes`}. Se quiser, decida agora o que fazer com elas — ou deixe para amanhã cedo.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {openCount > 0 && (
          <Button size="xs" variant="secondary" trailingIcon={<ArrowRightIcon size={12} />} onClick={() => document.getElementById("plano-do-dia")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Revisar pendências
          </Button>
        )}
        <Button size="xs" variant="ghost" onClick={dismiss}>Agora não</Button>
      </div>
    </section>
  );
}
