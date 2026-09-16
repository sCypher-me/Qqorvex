import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "chip" | "chip-accent";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-cyan text-background hover:opacity-90",
  secondary: "bg-surface-2 text-text-primary border border-border hover:bg-surface-1",
  ghost: "bg-transparent text-text-primary hover:bg-surface-1",
  destructive: "bg-error text-background hover:opacity-90",
  /**
   * Ações secundárias de card (docs/decisions/design-system-componentes-v1.md) — sem borda, só um
   * fundo tintado bem sutil. Decidido via brainstorming visual como alternativa ao `secondary`
   * (com borda) especificamente pro contexto de ações dentro de um `Card`.
   */
  chip: "bg-chip-neutral text-text-primary hover:opacity-80",
  "chip-accent": "bg-chip-cyan text-brand-cyan hover:opacity-80",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-sans font-semibold text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
