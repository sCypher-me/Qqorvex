import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cx } from "../cx";
import { triggerHaptic, type HapticLevel } from "../haptics";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "danger"
  | "ai"
  | "dashed"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-q " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gold text-on-gold shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(0_0_0/0.2)] hover:bg-gold-hover active:bg-gold-press",
  secondary: "border border-line bg-raised text-fg shadow-sm hover:border-line-strong hover:bg-overlay",
  ghost: "text-fg-2 hover:bg-hover hover:text-fg",
  subtle: "bg-hover text-fg hover:bg-selected",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:border-danger/50 hover:bg-danger/20",
  ai: "border border-ai-line bg-ai-soft text-ai-fg hover:bg-ai/20",
  dashed: "border border-dashed border-line-strong text-fg-2 hover:border-fg-3 hover:text-fg",
  link: "h-auto! px-0! text-gold-fg underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
  sm: "h-8 gap-1.5 rounded-md px-3 text-[13px]",
  md: "h-9 gap-2 rounded-lg px-3.5 text-[13.5px]",
  lg: "h-11 gap-2 rounded-lg px-5 text-[15px]",
};

const iconOnlySizes: Record<ButtonSize, string> = {
  xs: "w-7 px-0",
  sm: "w-8 px-0",
  md: "w-9 px-0",
  lg: "w-11 px-0",
};

/** Ação "pesada" vibra; navegação e ações leves não, para o toque não virar ruído. */
const HAPTIC: Partial<Record<ButtonVariant, HapticLevel>> = {
  primary: "light",
  ai: "light",
  danger: "warning",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export function buttonClasses({ variant = "primary", size, fullWidth, iconOnly }: ButtonStyleOptions = {}): string {
  const resolvedSize = size ?? "md";
  return cx(base, variants[variant], sizes[resolvedSize], iconOnly && iconOnlySizes[resolvedSize], fullWidth && "w-full");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size, fullWidth, iconOnly, loading = false, leadingIcon, trailingIcon, className, onClick, type = "button", disabled, children, ...props },
  ref,
) {
  const haptic = HAPTIC[variant];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, size, fullWidth, iconOnly }), className)}
      onClick={(event) => {
        if (haptic) triggerHaptic(haptic);
        onClick?.(event);
      }}
      {...props}
    >
      {loading ? <Spinner size={14} /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export interface ButtonLinkProps extends Omit<LinkProps, "className">, ButtonStyleOptions {
  className?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/** Link de navegação com aparência de botão (rotas internas). */
export function ButtonLink({ variant = "secondary", size, fullWidth, iconOnly, className, leadingIcon, trailingIcon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cx(buttonClasses({ variant, size, fullWidth, iconOnly }), className)} {...props}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

export interface ExternalButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonStyleOptions {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/** Link externo com aparência de botão — abre em nova aba com `noopener`. */
export function ExternalButtonLink({ variant = "secondary", size, fullWidth, iconOnly, className, leadingIcon, trailingIcon, children, ...props }: ExternalButtonLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={cx(buttonClasses({ variant, size, fullWidth, iconOnly }), className)} {...props}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </a>
  );
}
