import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "success" | "error" | "warning" | "info" | "premium" | "outline" | "module";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "",
  success: "qv-pill-success",
  error: "qv-pill-danger",
  warning: "qv-pill-warning",
  info: "qv-pill-info",
  premium: "qv-pill-premium",
  outline: "qv-pill-outline",
  module: "qv-pill-module",
};

/**
 * Pílula de status (Design System v1.0) — fundo tintado, sem borda. "Nunca comunicar estado só
 * por cor": o texto (`children`) é sempre obrigatório, a cor é reforço. `premium` (ouro) só para
 * marcos; `module` é a etiqueta em caixa alta que indica de qual módulo vem um item.
 */
export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span className={`qv-pill ${toneClasses[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}
