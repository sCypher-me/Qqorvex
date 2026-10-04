import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon, InfoIcon, SparkleIcon, TrophyIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { cx } from "../cx";

export type ToastTone = "neutral" | "success" | "danger" | "info" | "ai" | "achievement";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Ação opcional (ex.: "Desfazer"). */
  action?: { label: string; onClick: () => void };
  /** ms; `0` mantém até fechar. Padrão: 4.5s (7s quando há ação). */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  neutral: <InfoIcon weight="fill" />,
  info: <InfoIcon weight="fill" />,
  success: <CheckCircleIcon weight="fill" />,
  danger: <WarningCircleIcon weight="fill" />,
  ai: <SparkleIcon weight="fill" />,
  achievement: <TrophyIcon weight="fill" />,
};

const iconColor: Record<ToastTone, string> = {
  neutral: "text-fg-3",
  info: "text-info",
  success: "text-success",
  danger: "text-danger",
  ai: "text-ai-fg",
  achievement: "text-gold-fg",
};

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const tone = entry.tone ?? "neutral";
  const duration = entry.duration ?? (entry.action ? 7000 : 4500);
  const timer = useRef<number | null>(null);
  const start = useCallback(() => {
    if (duration > 0) timer.current = window.setTimeout(onDismiss, duration);
  }, [duration, onDismiss]);
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };
  useEffect(() => {
    start();
    return stop;
  }, [start]);

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      onMouseEnter={stop}
      onMouseLeave={start}
      className={cx(
        "pointer-events-auto flex w-full animate-slide-in-up items-start gap-3 rounded-xl border border-line bg-overlay px-3.5 py-3 text-fg shadow-lg sm:w-[360px]",
        tone === "achievement" && "border-gold-line shadow-[0_10px_42px_rgba(214,163,86,0.2)]",
      )}
    >
      <span className={cx("mt-0.5 flex shrink-0 [&_svg]:size-[18px]", iconColor[tone], tone === "achievement" && "animate-bounce motion-reduce:animate-none")}>{icons[tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug">{entry.title}</p>
        {entry.description && <p className="mt-0.5 text-[12.5px] leading-snug text-fg-3">{entry.description}</p>}
      </div>
      {entry.action && (
        <button
          type="button"
          onClick={() => {
            entry.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-gold-fg hover:bg-gold-soft"
        >
          {entry.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso" className="-mr-1 shrink-0 rounded-md p-1 text-fg-4 hover:bg-hover hover:text-fg">
        <XIcon size={14} />
      </button>
    </div>
  );
}

/** Fila de avisos efêmeros (confirmação de ação, desfazer, erro de rede). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const toast = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((list) => [...list.slice(-3), { ...options, id }]);
    return id;
  }, []);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:items-end"
          >
            {toasts.map((entry) => (
              <ToastItem key={entry.id} entry={entry} onDismiss={() => dismiss(entry.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** `toast({ title, tone })`. Fora do provider vira no-op (testes, telas isoladas). */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { toast: () => 0, dismiss: () => undefined };
}
