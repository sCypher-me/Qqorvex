import { forwardRef, type HTMLAttributes } from "react";

type CardAccent = "cyan" | "gold" | "none";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
}

const accentClasses: Record<CardAccent, string> = {
  cyan: "border-l-2 border-l-brand-cyan",
  gold: "border-l-2 border-l-brand-gold",
  none: "",
};

/**
 * Card padrão do design system (docs/decisions/design-system-componentes-v1.md) — decidido via
 * brainstorming visual. `forwardRef` porque alguns usos (ex.: `TaskCard` com `@dnd-kit/core`)
 * precisam do nó DOM real por baixo (`setNodeRef`), não só de props.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { accent = "cyan", className = "", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`bg-surface-2 border border-border rounded-card shadow-card p-4 flex flex-col gap-2 ${accentClasses[accent]} ${className}`}
      {...props}
    />
  );
});
