import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";

export type BadgeTone =
  | "neutral"
  | "gold"
  | "ai"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "outline"
  /** @deprecated aliases do design antigo */
  | "error"
  | "premium"
  | "module";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  /** Ponto colorido antes do texto — reforço visual; o texto continua obrigatório. */
  dot?: boolean;
  icon?: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-hover text-fg-2",
  gold: "bg-gold-soft text-gold-fg",
  ai: "bg-ai-soft text-ai-fg",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  outline: "border border-line text-fg-2",
  error: "bg-danger-soft text-danger",
  premium: "bg-gold-soft text-gold-fg",
  module: "bg-hover text-fg-3 uppercase tracking-[0.06em]",
};

/** Etiqueta de status/categoria. Estado nunca só por cor: o texto é obrigatório. */
export function Badge({ tone = "neutral", size = "sm", dot = false, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium leading-none",
        size === "sm" ? "h-5 px-1.5 text-2xs" : "h-6 px-2 text-xs",
        tones[tone],
        "[&_svg]:size-3",
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Etiqueta de categoria: texto neutro com um ponto na cor da categoria (`var(--q-cat-*)`). */
export function Tag({ color, children, className, onRemove }: { color?: string; children: ReactNode; className?: string; onRemove?: () => void }) {
  return (
    <span className={cx("inline-flex h-5 max-w-full items-center gap-1.5 rounded-md bg-hover px-1.5 text-2xs font-medium text-fg-2", className)}>
      {color && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remover ${typeof children === "string" ? children : "etiqueta"}`} className="-mr-0.5 rounded text-fg-4 hover:text-fg">
          ×
        </button>
      )}
    </span>
  );
}

/** Indicador de status mínimo (bolinha + rótulo opcional). */
export function StatusDot({ tone = "neutral", label, pulse = false }: { tone?: Exclude<BadgeTone, "outline" | "module">; label?: string; pulse?: boolean }) {
  const color: Record<string, string> = {
    neutral: "bg-fg-4",
    gold: "bg-gold",
    premium: "bg-gold",
    ai: "bg-ai",
    success: "bg-success",
    danger: "bg-danger",
    error: "bg-danger",
    warning: "bg-warning",
    info: "bg-info",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-3">
      <span aria-hidden="true" className={cx("h-2 w-2 rounded-full", color[tone], pulse && "animate-pulse-soft")} />
      {label}
    </span>
  );
}
