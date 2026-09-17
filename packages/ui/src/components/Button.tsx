import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "ghost"
  | "destructive"
  | "vex"
  | "premium"
  | "dashed"
  | "chip"
  | "chip-accent";

export type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Botões do Design System v1.0 — classes `qv-btn-*` em `@qqorvex/design-system/tokens.css`.
 * primary = grafite com borda cyan escura · secondary = contorno · quiet = contorno com texto
 * secundário · vex = ação da Vex (cyan tintado) · premium = ouro (só marcos) · destructive =
 * contorno vermelho, sem brilho. `chip`/`chip-accent` são os nomes antigos das ações de card e
 * viram `quiet`/`vex` em tamanho pequeno.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "qv-btn-primary",
  secondary: "qv-btn-secondary",
  quiet: "qv-btn-quiet",
  ghost: "qv-btn-ghost",
  destructive: "qv-btn-danger",
  vex: "qv-btn-vex",
  premium: "qv-btn-premium",
  dashed: "qv-btn-dashed",
  chip: "qv-btn-quiet",
  "chip-accent": "qv-btn-vex",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "qv-btn-xs",
  sm: "qv-btn-sm",
  md: "",
};

export function Button({ variant = "primary", size, className = "", ...props }: ButtonProps) {
  const resolvedSize = size ?? (variant === "chip" || variant === "chip-accent" ? "sm" : "md");
  return (
    <button
      className={`qv-btn ${variantClasses[variant]} ${sizeClasses[resolvedSize]} ${className}`}
      {...props}
    />
  );
}
