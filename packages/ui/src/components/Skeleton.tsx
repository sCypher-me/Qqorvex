import type { CSSProperties } from "react";

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Bloco de placeholder de carregamento — usar no formato/tamanho do conteúdo real que ele substitui. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return <span aria-hidden="true" className={`qv-skeleton block ${className}`} style={style} />;
}

export interface SkeletonRowProps {
  subtitle?: boolean;
  meta?: boolean;
  className?: string;
}

/** Uma linha de lista (título + legenda + meta à direita), no formato de `qv-row-top`. */
export function SkeletonRow({ subtitle = true, meta = true, className = "px-[18px] py-3" }: SkeletonRowProps) {
  return (
    <li aria-hidden="true" className={`qv-row-top flex items-center gap-2.5 ${className}`}>
      <span className="flex-1 min-w-0 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-2/5" />
        {subtitle && <Skeleton className="h-2.5 w-1/4" />}
      </span>
      {meta && <Skeleton className="h-3 w-12 shrink-0" />}
    </li>
  );
}

export interface SkeletonListProps extends SkeletonRowProps {
  rows?: number;
}

/** Lista de `SkeletonRow` — substitui "Carregando..." nos painéis de lista (`qv-row-top`). */
export function SkeletonList({ rows = 3, subtitle = true, meta = true, className }: SkeletonListProps) {
  return (
    <ul role="status" aria-label="Carregando" className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} subtitle={subtitle} meta={meta} className={className} />
      ))}
    </ul>
  );
}

/** Bloco retangular avulso (card, gráfico, formulário) — usar `className` para definir a forma. */
export function SkeletonBlock({ className = "h-24 w-full" }: { className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className="flex">
      <Skeleton className={className} />
    </div>
  );
}

/** Pilha de cards de altura fixa — substitui "Carregando..." em colunas/grades de cards (não listas `qv-row`). */
export function SkeletonCards({ count = 2, className = "h-20 w-full rounded-2xl" }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  );
}
