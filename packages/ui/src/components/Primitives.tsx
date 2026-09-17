import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/** Chip de filtro/aba em pílula — ativo fica cyan tintado. */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className = "", type = "button", ...props }: ChipProps) {
  return <button type={type} data-active={active} aria-pressed={active} className={`qv-chip ${className}`} {...props} />;
}

/** Grupo de chips para alternar entre visões de uma página (ex.: Kanban / Lista / Recorrentes). */
export interface ChipTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ChipTabs<T extends string>({ options, value, onChange, className = "" }: ChipTabsProps<T>) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`} role="tablist">
      {options.map((option) => (
        <Chip key={option.value} active={option.value === value} role="tab" onClick={() => onChange(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

/** Barra de progresso fina. `tone` segue a semântica: cyan = ativo, gold = marco, success/warning/error = estado. */
export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  tone?: "cyan" | "gold" | "success" | "warning" | "error";
  color?: string;
  height?: number;
}

const progressTone = {
  cyan: "var(--color-vex-cyan)",
  gold: "linear-gradient(90deg, var(--color-vex-gold-muted), var(--color-vex-gold-bright))",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

export function ProgressBar({ value, tone = "cyan", color, height = 6, className = "", style, ...props }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`qv-progress ${className}`}
      style={{ height, ...style }}
      {...props}
    >
      <span
        style={{
          width: `${pct}%`,
          background: color ?? progressTone[tone],
          boxShadow: tone === "gold" ? "0 0 16px rgba(210,166,111,.4)" : undefined,
        }}
      />
    </div>
  );
}

/** Anel de progresso (conic-gradient) com conteúdo central. */
export interface ProgressRingProps {
  value: number;
  size?: number;
  thickness?: number;
  tone?: "cyan" | "gold";
  children?: ReactNode;
}

export function ProgressRing({ value, size = 96, thickness = 9, tone = "cyan", children }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === "gold" ? "var(--color-vex-gold-bright)" : "var(--color-vex-cyan)";
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} 0 ${pct}%, rgba(42,48,57,.9) ${pct}% 100%)`,
      }}
    >
      <div
        className="rounded-full bg-vex-graphite flex flex-col items-center justify-center gap-px"
        style={{ width: size - thickness * 2, height: size - thickness * 2 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Cabeçalho de card: título (Manrope 16px) + meta mono + ações à direita. `divider` adiciona a linha inferior. */
export interface CardHeaderProps {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  divider?: boolean;
  display?: boolean;
  className?: string;
}

export function CardHeader({ title, meta, actions, divider = false, display = false, className = "" }: CardHeaderProps) {
  return (
    <div
      className={`flex items-center gap-3 flex-wrap ${divider ? "px-5 py-[18px] border-b border-border" : ""} ${className}`}
    >
      <span className={display ? "font-display text-[17px] font-semibold" : "text-base font-semibold"}>{title}</span>
      {meta !== undefined && <span className="font-mono text-xs text-text-muted">{meta}</span>}
      <span className="flex-1" />
      {actions}
    </div>
  );
}

/** Título de seção de página (Space Grotesk 18px) com ações à direita. */
export function SectionTitle({ children, meta, actions }: { children: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-display text-lg font-semibold">{children}</span>
      {meta !== undefined && <span className="font-mono text-xs text-text-muted">{meta}</span>}
      <span className="flex-1" />
      {actions}
    </div>
  );
}

/** Estado vazio/carregando — texto calmo e útil, nunca só "nada aqui". */
export function EmptyState({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-text-secondary leading-relaxed ${className}`}>{children}</p>;
}

/** Banner de erro/aviso: diz o que aconteceu, o que continua funcionando e o que fazer. */
export interface NoticeProps {
  tone?: "error" | "warning" | "success" | "info";
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const noticeTone = {
  error: "bg-[rgba(217,65,85,.10)] border-critical text-critical",
  warning: "bg-warning-bg border-warning-border text-warning",
  success: "bg-success-bg border-success-border text-success",
  info: "bg-info-bg border-info-border text-vex-cyan-bright",
};

export function Notice({ tone = "error", title, children, actions, className = "" }: NoticeProps) {
  return (
    <div className={`border rounded-[14px] p-4 flex flex-col gap-2.5 ${noticeTone[tone]} ${className}`} role="status">
      {title && <span className="text-sm font-semibold">{title}</span>}
      {children && <span className="text-[13px] leading-relaxed text-text-primary">{children}</span>}
      {actions && <div className="flex gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

/** Pequeno "switch" acessível. */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-[46px] h-[26px] rounded-full border border-border flex items-center p-0.5 cursor-pointer transition-colors shrink-0 disabled:opacity-50 ${
        checked ? "bg-[rgba(67,185,210,.35)] justify-end" : "bg-vex-raised justify-start"
      }`}
    >
      <span className={`w-5 h-5 rounded-full block ${checked ? "bg-vex-cyan-bright" : "bg-text-muted"}`} />
    </button>
  );
}
