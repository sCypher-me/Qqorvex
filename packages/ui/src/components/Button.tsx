import type { ButtonHTMLAttributes } from "react";
import { triggerHaptic, type HapticLevel } from "../haptics";

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
 * Botões do Design System. Primary é grafite com contorno ciano; ciano preenchido fica restrito
 * à ação contextual da Vex. Gold sinaliza marcos/metas, nunca lucro por si só.
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

/**
 * Só os botões de ação "pesada" vibram — nem toda a superfície clicável, senão cada toque vira
 * ruído tátil. `quiet`/`ghost`/`secondary`/`dashed`/`chip` (navegação, cancelar, ações leves) não
 * entram aqui de propósito.
 */
const HAPTIC_BY_VARIANT: Partial<Record<ButtonVariant, HapticLevel>> = {
  primary: "light",
  vex: "light",
  premium: "light",
  destructive: "warning",
  "chip-accent": "light",
};

export function Button({ variant = "primary", size, className = "", onClick, ...props }: ButtonProps) {
  const resolvedSize = size ?? (variant === "chip" || variant === "chip-accent" ? "sm" : "md");
  const hapticLevel = HAPTIC_BY_VARIANT[variant];
  return (
    <button
      className={`qv-btn ${variantClasses[variant]} ${sizeClasses[resolvedSize]} ${className}`}
      onClick={
        hapticLevel
          ? (event) => {
              triggerHaptic(hapticLevel);
              onClick?.(event);
            }
          : onClick
      }
      {...props}
    />
  );
}
