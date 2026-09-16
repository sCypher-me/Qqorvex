import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useLogPomodoroSession, usePomodoroSessions } from "../hooks/useVidaPessoal";
import { countCompletedPomodorosThisWeek, countCompletedPomodorosToday } from "../service";

const DURATIONS_MINUTES = [15, 30, 60];

interface RunningSession {
  startedAt: Date;
  endAt: Date;
}

/**
 * Mecânica igual ao app Forest: a sessão só é gravada quando termina — completa (`completed`) ou
 * "morre" (`died`) se a pessoa cancelar ou sair da aba antes do tempo acabar. Nenhuma linha "em
 * andamento" existe no banco; o cronômetro roda em estado local até esse momento.
 */
export function PomodoroTimer({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { sessions } = usePomodoroSessions(client);
  const logSession = useLogPomodoroSession(client, userId);
  const [duration, setDuration] = useState(DURATIONS_MINUTES[0]!);
  const [session, setSession] = useState<RunningSession | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (now.getTime() >= session.endAt.getTime()) {
      logSession.mutate({
        durationMinutes: duration,
        status: "completed",
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endAt.toISOString(),
      });
      setSession(null);
    }
  }, [now, session, duration, logSession]);

  useEffect(() => {
    if (!session) return;
    function handleVisibilityChange() {
      if (document.hidden && session) {
        logSession.mutate({
          durationMinutes: duration,
          status: "died",
          startedAt: session.startedAt.toISOString(),
          endedAt: new Date().toISOString(),
        });
        setSession(null);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, duration, logSession]);

  function handleStart() {
    const startedAt = new Date();
    const endAt = new Date(startedAt.getTime() + duration * 60_000);
    setNow(startedAt);
    setSession({ startedAt, endAt });
  }

  function handleCancel() {
    if (!session) return;
    logSession.mutate({
      durationMinutes: duration,
      status: "died",
      startedAt: session.startedAt.toISOString(),
      endedAt: new Date().toISOString(),
    });
    setSession(null);
  }

  const totalSeconds = duration * 60;
  const remainingSeconds = session
    ? Math.max(0, Math.round((session.endAt.getTime() - now.getTime()) / 1000))
    : totalSeconds;
  const progress = session ? 1 - remainingSeconds / totalSeconds : 0;
  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;

  const today = new Date();
  const completedToday = countCompletedPomodorosToday(sessions, today);
  const completedThisWeek = countCompletedPomodorosThisWeek(sessions, today);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4 flex flex-col items-center gap-3">
      <div
        className="text-6xl transition-transform duration-1000 ease-linear select-none"
        style={{ transform: `scale(${0.4 + progress * 0.6})` }}
        aria-hidden
      >
        🌳
      </div>

      {session ? (
        <>
          <p className="font-display text-2xl text-text-primary tabular-nums">
            {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
          </p>
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar (a árvore morre)
          </Button>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            {DURATIONS_MINUTES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`text-sm px-3 py-1.5 rounded-md border ${
                  duration === d ? "border-primary text-primary" : "border-border text-text-primary hover:bg-surface-1"
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={handleStart}>
            Começar
          </Button>
        </>
      )}

      <p className="font-sans text-xs text-text-secondary-warm">
        {completedToday} {completedToday === 1 ? "árvore" : "árvores"} hoje · {completedThisWeek} esta semana
      </p>
    </div>
  );
}
