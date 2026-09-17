import { forwardRef, type HTMLAttributes } from "react";

export type CardVariant = "default" | "vex" | "milestone" | "tile" | "well" | "column";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * default = vidro grafite (card padrão) · vex = insight/presença da Vex (cyan) · milestone =
   * marco/gamificação (ouro, canto cortado) · tile = card compacto sólido (kanban, badges) ·
   * well = área rebaixada dentro de um card · column = coluna de kanban.
   */
  variant?: CardVariant;
  /** Sem padding interno — para cards com cabeçalho/lista que controlam o próprio espaçamento. */
  flush?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: "qv-card",
  vex: "qv-card-vex",
  milestone: "qv-card-milestone",
  tile: "qv-tile",
  well: "qv-well",
  column: "qv-column",
};

/**
 * Card do Design System v1.0. Nunca usa borda colorida à esquerda como destaque — ênfase vem da
 * variante (vex/milestone). `forwardRef` porque alguns usos (ex.: `TaskCard` com `@dnd-kit/core`)
 * precisam do nó DOM real por baixo (`setNodeRef`), não só de props.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", flush = false, className = "", ...props },
  ref,
) {
  const padding = flush ? "" : variant === "tile" || variant === "well" ? "p-3" : "p-5";
  return <div ref={ref} className={`${variantClasses[variant]} ${padding} flex flex-col gap-3 ${className}`} {...props} />;
});
