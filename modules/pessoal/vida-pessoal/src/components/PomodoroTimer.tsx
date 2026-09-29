import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ProgressRing, SkeletonCards } from "@qqorvex/ui";
import { useLogPomodoroSession, usePomodoroSessions } from "../hooks/useVidaPessoal";
import { completedPomodoroMinutesThisWeek, countCompletedPomodorosThisWeek, countCompletedPomodorosToday } from "../service";
import type { NewPomodoroSessionInput } from "../types";
import { FocusAudioPlayer } from "./FocusAudioPlayer";

const DURATIONS_MINUTES = [15, 30, 60];

interface RunningSession {
  startedAt: Date;
  endAt: Date;
}

/**
 * Mecânica igual ao app Forest: a sessão só é gravada quando termina — completa (`completed`) ou
 * "morre" (`died`) se a pessoa cancelar ou sair da aba antes do tempo acabar. A trilha local toca
 * dentro do app e não cria uma sessão externa. Nenhuma linha "em andamento" existe no banco; o cronômetro
 * roda em estado local até esse momento.
 */
export function PomodoroTimer({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { sessions, isLoading: sessionsLoading, error: sessionsError, refetch: retrySessions } = usePomodoroSessions(client);
  const logSession = useLogPomodoroSession(client, userId);
  const [duration, setDuration] = useState(DURATIONS_MINUTES[0]!);
  const [session, setSession] = useState<RunningSession | null>(null);
  const [failedSession, setFailedSession] = useState<NewPomodoroSessionInput | null>(null);
  const [now, setNow] = useState(() => new Date());

  const saveSession = useCallback((input: NewPomodoroSessionInput) => {
    logSession.mutate(input, {
      onSuccess: () => setFailedSession(null),
      onError: () => setFailedSession(input),
    });
  }, [logSession.mutate]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (now.getTime() >= session.endAt.getTime()) {
      saveSession({
        durationMinutes: duration,
        status: "completed",
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endAt.toISOString(),
      });
      setSession(null);
    }
  }, [now, session, duration, saveSession]);

  useEffect(() => {
    if (!session) return;
    function handleVisibilityChange() {
      if (!document.hidden) {
        return;
      }
      if (session) {
        saveSession({
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
  }, [session, duration, saveSession]);

  function handleStart() {
    if (failedSession || logSession.isPending) return;
    const startedAt = new Date();
    const endAt = new Date(startedAt.getTime() + duration * 60_000);
    setNow(startedAt);
    setSession({ startedAt, endAt });
  }

  function handleCancel() {
    if (!session) return;
    saveSession({
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
  const focusedMinutesThisWeek = completedPomodoroMinutesThisWeek(sessions, today);
  const recentSessions = sessions.slice(0, 5);

  function formatSessionDate(startedAt: string): string {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      .format(new Date(startedAt)).replace(".", "");
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-[22px] flex flex-col items-center gap-[18px]">
      <h2 className="self-start font-display text-lg font-semibold text-fg">Pomodoro</h2>

      <ProgressRing value={progress * 100} size={180} thickness={14}>
        <span className="font-mono text-[34px] font-semibold tabular-nums text-fg" role="timer">
          {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
        </span>
        <span className="text-[11px] tracking-[.1em] uppercase text-fg-3">
          {session ? "foco" : "pronto"} · <span className="font-mono">{duration}</span> min
        </span>
      </ProgressRing>

      {session ? (
        <div className="flex flex-col gap-2 w-full">
          <Button type="button" variant="quiet" className="w-full" onClick={handleCancel}>
            Encerrar
          </Button>
          <span className="text-xs text-fg-3 text-center leading-relaxed">
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
                      ? "bg-gold-soft border-gold-line text-gold-fg"
                      : "bg-canvas border-line text-fg-2 hover:text-fg hover:border-line-strong"
                  }`}
                >
                  {d}m
                </button>
              );
            })}
          </div>
          <Button type="button" variant="vex" className="w-full" onClick={handleStart} disabled={Boolean(failedSession) || logSession.isPending}>
            {logSession.isPending ? "Salvando sessão anterior…" : failedSession ? "Salve a sessão anterior para continuar" : "Começar"}
          </Button>
        </div>
      )}

      <div className="w-full flex flex-col">
        <div className="border-t border-line-soft flex items-baseline gap-2.5 py-2">
          <span className="flex-1 text-[13px] text-fg">Concluídos hoje</span>
          <span className="font-mono text-xs text-fg-2">{completedToday}</span>
        </div>
        <div className="border-t border-line-soft flex items-baseline gap-2.5 py-2">
          <span className="flex-1 text-[13px] text-fg">Esta semana</span>
          <span className="font-mono text-xs text-fg-2">{completedThisWeek} sessões · {focusedMinutesThisWeek} min</span>
        </div>
      </div>

      {failedSession && (
        <div className="w-full rounded-xl border border-danger/30 bg-error/5 p-3" role="alert">
          <p className="text-sm text-fg">A sessão terminou, mas não foi possível salvar o registro.</p>
          <Button type="button" variant="quiet" size="sm" className="mt-2" disabled={logSession.isPending} onClick={() => saveSession(failedSession)}>
            {logSession.isPending ? "Salvando…" : "Tentar salvar novamente"}
          </Button>
        </div>
      )}
      <section className="w-full border-t border-line pt-4" aria-labelledby="pomodoro-history-title">
        <div className="mb-3 flex items-baseline gap-2">
          <h3 id="pomodoro-history-title" className="flex-1 text-sm font-semibold text-fg">Sessões recentes</h3>
          <span className="text-[11px] text-fg-3">concluídas e interrompidas</span>
        </div>
        {sessionsLoading ? (
          <SkeletonCards count={2} className="h-8 w-full rounded-xl" />
        ) : sessionsError ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-error/5 p-3" role="alert">
            <p className="flex-1 text-xs text-fg-2">Não foi possível carregar as sessões salvas.</p>
            <Button type="button" variant="quiet" size="sm" onClick={() => void retrySessions()}>Tentar novamente</Button>
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5 text-xs leading-relaxed text-fg-3">Suas sessões aparecem aqui depois do primeiro foco.</p>
        ) : (
          <ul className="flex flex-col">
            {recentSessions.map((recent) => (
              <li key={recent.id} className="border-t border-line-soft flex items-center gap-2 py-2 text-xs">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${recent.status === "completed" ? "bg-success" : "bg-text-muted"}`} aria-hidden="true" />
                <span className="flex-1 text-fg-2">{formatSessionDate(recent.started_at)}</span>
                <span className="font-mono text-fg">{recent.duration_minutes} min</span>
                <span className="text-fg-3">{recent.status === "completed" ? "Concluída" : "Interrompida"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FocusAudioPlayer />
    </div>
  );
}
