import { useCallback, useEffect, useState } from "react";
import { StopIcon, TimerIcon } from "@phosphor-icons/react";
import { Button, Tooltip } from "@qqorvex/ui";

const STORAGE_KEY = "qqorvex.study-timer";

interface TimerState {
  notebookId: string;
  notebookName: string;
  startedAt: number;
}

function read(): TimerState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    return typeof parsed.startedAt === "number" && typeof parsed.notebookId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function write(state: TimerState | null) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* armazenamento indisponível: o cronômetro vale só nesta tela */
  }
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/** Cronômetro de sessão de estudo que sobrevive a trocas de tela (fica no armazenamento local). */
function useStudyTimer() {
  const [state, setState] = useState<TimerState | null>(() => (typeof window === "undefined" ? null : read()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const start = useCallback((notebookId: string, notebookName: string) => {
    const next = { notebookId, notebookName, startedAt: Date.now() };
    write(next);
    setState(next);
    setNow(Date.now());
  }, []);

  /** Encerra e devolve os minutos (mínimo 1). */
  const stop = useCallback((): { notebookId: string; minutes: number; startedAt: number } | null => {
    const current = read() ?? state;
    write(null);
    setState(null);
    if (!current) return null;
    return { notebookId: current.notebookId, startedAt: current.startedAt, minutes: Math.max(1, Math.round((Date.now() - current.startedAt) / 60_000)) };
  }, [state]);

  return { running: state, elapsed: state ? now - state.startedAt : 0, start, stop };
}

/** Botão Iniciar/Encerrar sessão; ao encerrar entrega os minutos para registrar. */
export function StudyTimerButton({ notebookId, notebookName, onFinish }: { notebookId: string; notebookName: string; onFinish: (minutes: number, startedAt: number) => void }) {
  const { running, elapsed, start, stop } = useStudyTimer();

  if (running && running.notebookId !== notebookId) {
    return (
      <Tooltip content={`Há uma sessão em andamento em “${running.notebookName}”`}>
        <Button variant="secondary" leadingIcon={<TimerIcon size={16} />} disabled>
          {formatElapsed(elapsed)}
        </Button>
      </Tooltip>
    );
  }

  if (running) {
    return (
      <Button
        variant="secondary"
        leadingIcon={<StopIcon size={15} weight="fill" className="text-danger" />}
        onClick={() => {
          const result = stop();
          if (result) onFinish(result.minutes, result.startedAt);
        }}
        aria-label={`Encerrar sessão de estudo (${formatElapsed(elapsed)})`}
      >
        <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        <span className="hidden sm:inline">· Encerrar</span>
      </Button>
    );
  }

  return (
    <Button variant="secondary" leadingIcon={<TimerIcon size={16} />} onClick={() => start(notebookId, notebookName)}>
      Iniciar sessão
    </Button>
  );
}
