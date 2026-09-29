import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import { cx } from "../cx";

/* ───────────────────────────── Skeleton ───────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cx("q-skeleton", className)} style={style} />;
}

export interface SkeletonRowProps {
  subtitle?: boolean;
  meta?: boolean;
  leading?: boolean;
  className?: string;
}

export function SkeletonRow({ subtitle = true, meta = true, leading = false, className = "px-4 py-3" }: SkeletonRowProps) {
  return (
    <li aria-hidden="true" className={cx("flex items-center gap-3 border-t border-line-soft first:border-t-0", className)}>
      {leading && <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-2/5" />
        {subtitle && <Skeleton className="h-2.5 w-1/4" />}
      </span>
      {meta && <Skeleton className="h-3 w-12 shrink-0" />}
    </li>
  );
}

export function SkeletonList({ rows = 3, subtitle = true, meta = true, leading = false, className }: SkeletonRowProps & { rows?: number }) {
  return (
    <ul role="status" aria-label="Carregando" className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} subtitle={subtitle} meta={meta} leading={leading} className={className} />
      ))}
    </ul>
  );
}

export function SkeletonBlock({ className = "h-24 w-full" }: { className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className="flex">
      <Skeleton className={className} />
    </div>
  );
}

export function SkeletonCards({ count = 2, className = "h-20 w-full rounded-xl" }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  );
}

/* ───────────────────────────── Progresso ───────────────────────────── */

export type ProgressTone = "gold" | "ai" | "success" | "warning" | "danger" | "neutral" | "cyan" | "error";

const progressColor: Record<ProgressTone, string> = {
  gold: "var(--q-gold)",
  cyan: "var(--q-gold)",
  ai: "var(--q-ai)",
  success: "var(--q-success)",
  warning: "var(--q-warning)",
  danger: "var(--q-danger)",
  error: "var(--q-danger)",
  neutral: "var(--q-fg-3)",
};

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  tone?: ProgressTone;
  color?: string;
  height?: number;
  /** Nome acessível (ex.: "Progresso da meta"). */
  label?: string;
}

export function ProgressBar({ value, tone = "gold", color, height = 6, label, className, style, ...props }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("w-full overflow-hidden rounded-full bg-selected", className)}
      style={{ height, ...style }}
      {...props}
    >
      <span className="block h-full rounded-full transition-[width] duration-500 ease-q" style={{ width: `${pct}%`, background: color ?? progressColor[tone] }} />
    </div>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  thickness?: number;
  tone?: ProgressTone;
  color?: string;
  children?: ReactNode;
  label?: string;
}

export function ProgressRing({ value, size = 88, thickness = 8, tone = "gold", color, children, label }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--q-selected)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? progressColor[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-q"
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}

/* ───────────────────────────── Avatar ───────────────────────────── */

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, name, size = 32, className, ring = false }: { src?: string | null; name: string; size?: number; className?: string; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  const classes = cx("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", ring && "ring-2 ring-gold-line ring-offset-2 ring-offset-canvas", className);
  if (src) return <img src={src} alt="" className={cx(classes, "object-cover")} style={style} />;
  return (
    <span aria-hidden="true" className={cx(classes, "bg-gold-soft font-semibold text-gold-fg")} style={style}>
      {initialsOf(name) || "·"}
    </span>
  );
}

/* ───────────────────────────── Métricas ───────────────────────────── */

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Variação (ex.: "+12%"), com direção explícita para a cor. */
  delta?: { value: ReactNode; direction: "up" | "down" | "flat"; /** "up" é bom? (receita: sim; despesa: não) */ positiveIsGood?: boolean };
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Destaque (valor maior). */
  emphasis?: boolean;
}

export function Stat({ label, value, delta, hint, icon, className, emphasis = false }: StatProps) {
  const good = delta ? (delta.direction === "flat" ? null : (delta.direction === "up") === (delta.positiveIsGood ?? true)) : null;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg-3 [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cx("font-display font-semibold leading-none tracking-[-0.02em] text-fg tabular-nums", emphasis ? "text-[30px]" : "text-[22px]")}>{value}</div>
      {(delta || hint) && (
        <div className="flex min-w-0 items-center gap-2 text-xs">
          {delta && (
            <span className={cx("inline-flex items-center gap-0.5 font-medium tabular-nums", good === null ? "text-fg-3" : good ? "text-success" : "text-danger")}>
              {delta.direction === "up" && <ArrowUpRightIcon weight="bold" size={12} aria-hidden="true" />}
              {delta.direction === "down" && <ArrowDownRightIcon weight="bold" size={12} aria-hidden="true" />}
              {delta.value}
            </span>
          )}
          {hint && <span className="truncate text-fg-3">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/** Card de métrica (Stat dentro de um contêiner). */
export function StatCard(props: StatProps & { onClick?: () => void; footer?: ReactNode }) {
  const { onClick, footer, className, ...stat } = props;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-left",
        onClick && "transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-raised",
        className,
      )}
    >
      <Stat {...stat} />
      {footer}
    </Tag>
  );
}

/* ───────────────────────────── Miscelânea ───────────────────────────── */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx("q-kbd", className)}>{children}</kbd>;
}

/** Rótulo pequeno em caixa alta (agrupadores de lista, seções de menu). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-2xs font-semibold uppercase tracking-[0.08em] text-fg-4", className)}>{children}</p>;
}

/** Valor monetário/numérico com sinal e cor semântica opcionais. */
export function Amount({ value, currency = "BRL", tone = "auto", showSign = false, className }: { value: number; currency?: string; tone?: "auto" | "neutral"; showSign?: boolean; className?: string }) {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Math.abs(value));
  const sign = value < 0 ? "−" : showSign && value > 0 ? "+" : "";
  const color = tone === "neutral" || value === 0 ? "" : value > 0 ? "text-success" : "text-fg";
  return <span className={cx("tabular-nums", color, className)}>{sign}{formatted}</span>;
}
