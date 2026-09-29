import { useCallback, useEffect, useState } from "react";
import { PlayIcon, StopIcon, TimerIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Notice, ProgressRing, Segmented, Skeleton, cx } from "@qqorvex/ui";
import { useLogPomodoroSession, usePomodoroSessions } from "../hooks/useVidaPessoal";
import { completedPomodoroMinutesThisWeek, countCompletedPomodorosToday, localDateKey } from "../service";
import type { NewPomodoroSessionInput, PomodoroSession } from "../types";
import { FocusAudioPlayer } from "./FocusAudioPlayer";

const DURATIONS = ["15", "25", "45", "60"] as const;
type Duration = (typeof DURATIONS)[number];
const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

interface RunningSession {
  startedAt: Date;
  endAt: Date;
  minutes: number;
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

/** Minutos concluídos por dia nos últimos 7 dias (hoje por último). */
function lastSevenDays(sessions: PomodoroSession[], reference: Date) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 6 + index);
    return { key: localDateKey(date), weekday: date.getDay(), day: date.getDate(), minutes: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const day = byKey.get(localDateKey(new Date(session.started_at)));
    if (day) day.minutes += session.duration_minutes;
  }
  return days;
}

/**
 * Mecânica igual ao app Forest: a sessão só é gravada quando termina — completa (`completed`) ou
 * "morre" (`died`) se a pessoa encerrar ou sair da aba antes do tempo acabar. Nenhuma linha
 * "em andamento" existe no banco; o cronômetro roda em estado local até esse momento.
 */
export function PomodoroTimer({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { sessions, isLoading: sessionsLoading, error: sessionsError, refetch: retrySessions } = usePomodoroSessions(client);
  const logSession = useLogPomodoroSession(client, userId);
  const [duration, setDuration] = useState<Duration>("25");
  const [session, setSession] = useState<RunningSession | null>(null);
  const [failedSession, setFailedSession] = useState<NewPomodoroSessionInput | null>(null);
  const [now, setNow] = useState(() => new Date());

  const saveSession = useCallback(
    (input: NewPomodoroSessionInput) => {
      logSession.mutate(input, {
        onSuccess: () => setFailedSession(null),
        onError: () => setFailedSession(input),
      });
    },
    [logSession.mutate],
  );

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (now.getTime() >= session.endAt.getTime()) {
      saveSession({ durationMinutes: session.minutes, status: "completed", startedAt: session.startedAt.toISOString(), endedAt: session.endAt.toISOString() });
      setSession(null);
    }
  }, [now, session, saveSession]);

  useEffect(() => {
    if (!session) return;
    function handleVisibilityChange() {
      if (!document.hidden || !session) return;
      saveSession({ durationMinutes: session.minutes, status: "died", startedAt: session.startedAt.toISOString(), endedAt: new Date().toISOString() });
      setSession(null);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, saveSession]);

  function handleStart() {
    if (failedSession || logSession.isPending) return;
    const startedAt = new Date();
    const minutes = Number(duration);
    setNow(startedAt);
    setSession({ startedAt, endAt: new Date(startedAt.getTime() + minutes * 60_000), minutes });
  }

  function handleCancel() {
    if (!session) return;
    saveSession({ durationMinutes: session.minutes, status: "died", startedAt: session.startedAt.toISOString(), endedAt: new Date().toISOString() });
    setSession(null);
  }

  const totalSeconds = (session?.minutes ?? Number(duration)) * 60;
  const remainingSeconds = session ? Math.max(0, Math.round((session.endAt.getTime() - now.getTime()) / 1000)) : totalSeconds;
  const progress = session ? 1 - remainingSeconds / totalSeconds : 0;
  const clock = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const today = new Date();
  const completedToday = countCompletedPomodorosToday(sessions, today);
  const minutesThisWeek = completedPomodoroMinutesThisWeek(sessions, today);
  const week = lastSevenDays(sessions, today);
  const weekMax = Math.max(30, ...week.map((day) => day.minutes));
  const recent = sessions.slice(0, 4);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface" aria-labelledby="focus-title">
      <header className="flex items-center gap-2 px-4 pt-4 sm:px-5">
        <TimerIcon size={17} className="text-fg-3" />
        <h2 id="focus-title" className="flex-1 text-[15px] font-semibold text-fg">
          Foco
        </h2>
        <span className="text-xs text-fg-3">{completedToday} {completedToday === 1 ? "sessão" : "sessões"} hoje</span>
      </header>

      <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-3 sm:px-5">
        <ProgressRing value={progress * 100} size={188} thickness={10} label="Tempo de foco">
          <span className="font-display text-[40px] font-semibold leading-none tabular-nums text-fg" role="timer" aria-live="off">
            {clock}
          </span>
          <span className={cx("mt-1.5 text-xs", session ? "font-medium text-gold-fg" : "text-fg-3")}>{session ? "focando" : `sessão de ${duration} min`}</span>
        </ProgressRing>

        {session ? (
          <div className="flex w-full flex-col items-center gap-2">
            <Button variant="secondary" fullWidth leadingIcon={<StopIcon size={15} weight="fill" />} onClick={handleCancel}>
              Encerrar sessão
            </Button>
            <p className="text-center text-xs leading-relaxed text-fg-3">Encerrar antes do fim ou sair da aba interrompe a sessão.</p>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2.5">
            <Segmented<Duration> label="Duração" fullWidth value={duration} onChange={setDuration} options={DURATIONS.map((value) => ({ value, label: `${value} min` }))} />
            <Button fullWidth leadingIcon={<PlayIcon size={15} weight="fill" />} onClick={handleStart} disabled={Boolean(failedSession)} loading={logSession.isPending}>
              {failedSession ? "Salve a sessão anterior primeiro" : "Começar"}
            </Button>
          </div>
        )}

        {failedSession && (
          <Notice compact actions={<Button size="sm" variant="secondary" loading={logSession.isPending} onClick={() => saveSession(failedSession)}>Tentar de novo</Button>}>
            A sessão terminou, mas o registro não foi salvo.
          </Notice>
        )}
      </div>

      <div className="border-t border-line-soft px-4 py-3.5 sm:px-5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold text-fg-2">Esta semana</h3>
          <span className="text-xs tabular-nums text-fg-3">{formatMinutes(minutesThisWeek)} de foco</span>
        </div>
        {sessionsLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : sessionsError ? (
          <Notice compact actions={<Button size="sm" variant="secondary" onClick={() => void retrySessions()}>Tentar de novo</Button>}>Não foi possível carregar as sessões.</Notice>
        ) : (
          <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`Minutos de foco por dia: ${week.map((day) => `${day.day}: ${day.minutes} min`).join(", ")}`}>
            {week.map((day, index) => (
              <div key={day.key} className="flex flex-col items-center gap-1" title={`${day.day}: ${formatMinutes(day.minutes)}`}>
                <div className="flex h-10 w-full items-end justify-center">
                  <span className={cx("w-full max-w-6 rounded-t-[4px]", day.minutes ? (index === 6 ? "bg-gold" : "bg-gold/55") : "h-0.5 bg-line")} style={day.minutes ? { height: `${Math.max(8, (day.minutes / weekMax) * 100)}%` } : undefined} />
                </div>
                <span className={cx("text-[10px]", index === 6 ? "font-semibold text-fg-2" : "text-fg-4")}>{WEEKDAY_INITIAL[day.weekday]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="border-t border-line-soft px-4 py-3 sm:px-5">
          <h3 className="mb-1.5 text-xs font-semibold text-fg-2">Sessões recentes</h3>
          <ul className="flex flex-col">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-1 text-xs">
                <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", item.status === "completed" ? "bg-success" : "bg-fg-4")} aria-hidden="true" />
                <span className="flex-1 text-fg-2">
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.started_at)).replace(".", "")}
                </span>
                <span className="tabular-nums text-fg">{item.duration_minutes} min</span>
                <span className="w-20 text-right text-fg-3">{item.status === "completed" ? "concluída" : "interrompida"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-line-soft px-4 py-3.5 sm:px-5">
        <FocusAudioPlayer />
      </div>
    </section>
  );
}
