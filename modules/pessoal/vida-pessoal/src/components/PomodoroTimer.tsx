import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ProgressRing } from "@qqorvex/ui";
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
    <div className="qv-card p-[22px] flex flex-col items-center gap-[18px]">
      <h2 className="self-start font-display text-lg font-semibold text-text-primary">Pomodoro</h2>

      <ProgressRing value={progress * 100} size={180} thickness={14}>
        <span className="font-mono text-[34px] font-semibold tabular-nums text-text-primary" role="timer">
          {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
        </span>
        <span className="text-[11px] tracking-[.1em] uppercase text-text-muted">
          {session ? "foco" : "pronto"} · <span className="font-mono">{duration}</span> min
        </span>
      </ProgressRing>

      {session ? (
        <div className="flex flex-col gap-2 w-full">
          <Button type="button" variant="quiet" className="w-full" onClick={handleCancel}>
            Encerrar
          </Button>
          <span className="text-xs text-text-muted text-center leading-relaxed">
            Encerrar antes do fim ou sair da aba perde a sessão.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex gap-2" role="radiogroup" aria-label="Duração">
            {DURATIONS_MINUTES.map((d) => {
              const selected = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setDuration(d)}
                  className={`flex-1 rounded-xl py-2 font-mono text-[13px] border cursor-pointer transition-colors ${
                    selected
                      ? "bg-[rgba(67,185,210,.12)] border-vex-cyan-dark text-vex-cyan-bright"
                      : "bg-vex-obsidian border-border text-text-secondary hover:text-text-primary hover:border-text-muted"
                  }`}
                >
                  {d}m
                </button>
              );
            })}
          </div>
          <Button type="button" variant="vex" className="w-full" onClick={handleStart}>
            Começar
          </Button>
        </div>
      )}

      <div className="w-full flex flex-col">
        <div className="qv-row-top flex items-baseline gap-2.5 py-2">
          <span className="flex-1 text-[13px] text-text-primary">Concluídos hoje</span>
          <span className="font-mono text-xs text-text-secondary">{completedToday}</span>
        </div>
        <div className="qv-row-top flex items-baseline gap-2.5 py-2">
          <span className="flex-1 text-[13px] text-text-primary">Esta semana</span>
          <span className="font-mono text-xs text-text-secondary">{completedThisWeek}</span>
        </div>
      </div>
    </div>
  );
}
