import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../cx";

export type IconButtonVariant = "ghost" | "secondary" | "subtle" | "primary" | "danger" | "ai";
export type IconButtonSize = "xs" | "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nome acessível obrigatório — controle só com ícone nunca fica sem nome. Também vira tooltip. */
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Estado ligado (ex.: filtro ativo, painel aberto). */
  active?: boolean;
  /** Esconde o tooltip nativo (quando já há texto visível ao lado). */
  hideTooltip?: boolean;
}

const variants: Record<IconButtonVariant, string> = {
  ghost: "text-fg-3 hover:bg-hover hover:text-fg",
  secondary: "border border-line bg-raised text-fg-2 shadow-sm hover:border-line-strong hover:text-fg",
  subtle: "bg-hover text-fg-2 hover:bg-selected hover:text-fg",
  primary: "bg-gold text-on-gold hover:bg-gold-hover",
  danger: "text-fg-3 hover:bg-danger-soft hover:text-danger",
  ai: "border border-ai-line bg-ai-soft text-ai-fg hover:bg-ai/20",
};

const sizes: Record<IconButtonSize, string> = {
  xs: "h-6 w-6 rounded-md [&_svg]:size-3.5",
  sm: "h-7 w-7 rounded-md [&_svg]:size-4",
  md: "h-8 w-8 rounded-lg [&_svg]:size-[18px]",
  lg: "h-10 w-10 rounded-lg [&_svg]:size-5",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", active = false, hideTooltip = false, type = "button", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={hideTooltip ? undefined : label}
      data-active={active || undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center transition-[background-color,color,border-color] duration-150 ease-q",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        active && "bg-selected text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
