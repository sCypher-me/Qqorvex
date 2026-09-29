import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../cx";

export type CardVariant =
  | "default"
  | "raised"
  | "inset"
  | "outline"
  | "interactive"
  | "gold"
  | "ai";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Mantém o layout em coluna com espaçamento (padrão). `false` deixa o conteúdo livre. */
  stack?: boolean;
}

const variants: Record<CardVariant, string> = {
  default: "border border-line bg-surface",
  raised: "border border-line bg-raised shadow-sm",
  inset: "border border-line-soft bg-canvas/60",
  outline: "border border-line",
  interactive: "border border-line bg-surface transition-[border-color,background-color,transform] duration-150 ease-q hover:border-line-strong hover:bg-raised",
  gold: "border border-gold-line bg-[color-mix(in_srgb,var(--q-gold)_6%,var(--q-surface))]",
  ai: "border border-ai-line bg-[color-mix(in_srgb,var(--q-ai)_6%,var(--q-surface))]",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

/** Contêiner base. Superfícies se diferenciam por luminância e borda, não por sombra. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", padding, stack = true, className, ...props },
  ref,
) {
  const resolvedPadding: CardPadding = padding ?? "md";
  return (
    <div
      ref={ref}
      className={cx("min-w-0 rounded-xl", variants[variant], paddings[resolvedPadding], stack && "flex flex-col gap-3", className)}
      {...props}
    />
  );
});

export interface CardHeaderProps {
  title: ReactNode;
  /** Texto de apoio abaixo do título. */
  description?: ReactNode;
  /** Metadado curto ao lado do título (contagem, data). */
  meta?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Linha divisória abaixo — use em cards com `padding="none"`. */
  divider?: boolean;
  className?: string;
}

export function CardHeader({ title, description, meta, icon, actions, divider = false, className }: CardHeaderProps) {
  return (
    <div className={cx("flex min-w-0 items-start gap-3", divider && "border-b border-line px-4 py-3.5 sm:px-5", className)}>
      {icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2 [&_svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="truncate text-[14px] font-semibold leading-snug text-fg">{title}</h3>
          {meta !== undefined && meta !== null && <span className="text-xs tabular-nums text-fg-3">{meta}</span>}
        </div>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export interface SectionTitleProps {
  children: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Título de seção dentro de uma página (acima de uma lista, grade ou grupo de cards). */
export function SectionTitle({ children, meta, description, actions, className }: SectionTitleProps) {
  return (
    <div className={cx("flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] text-fg">{children}</h2>
          {meta !== undefined && meta !== null && <span className="text-xs tabular-nums text-fg-3">{meta}</span>}
        </div>
        {description && <p className="mt-0.5 text-[13px] text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Divider({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return <div role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} className={cx(vertical ? "w-px self-stretch bg-line" : "h-px w-full bg-line", className)} />;
}
