import type { HTMLAttributes } from "react";

export type BadgeTone = "success" | "error" | "warning" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  error: "bg-error-bg text-error",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
};

const dotClasses: Record<BadgeTone, string> = {
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
};

/** Badge de status (docs/decisions/design-system-componentes-v1.md) — ponto indicador, sem borda, fundo tintado sutil. "Nunca comunicar estado só por cor": o texto (`children`) é sempre obrigatório, a cor é reforço, não a única pista. */
export function Badge({ tone, className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[tone]}`} />
      {children}
    </span>
  );
}
