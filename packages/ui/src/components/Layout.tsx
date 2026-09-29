import type { ReactNode } from "react";
import { cx } from "../cx";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Linha pequena acima do título (data, área). */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo abaixo (abas, filtros). */
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/** Cabeçalho de página: título, contexto e as ações principais da tela. */
export function PageHeader({ title, description, eyebrow, actions, children, className, icon }: PageHeaderProps) {
  return (
    <header className={cx("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-gold-fg [&_svg]:size-5">{icon}</span>}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-xs font-medium text-fg-3">{eyebrow}</p>}
            <h1 className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg sm:text-[28px]">{title}</h1>
            {description && <p className="mt-1.5 max-w-[640px] text-[14px] leading-relaxed text-fg-3">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Coluna de página com largura máxima e ritmo vertical padrão. */
export function PageContainer({ children, className, width = "default" }: { children: ReactNode; className?: string; width?: "default" | "wide" | "narrow" | "full" }) {
  return (
    <div
      className={cx(
        "mx-auto flex w-full min-w-0 flex-col gap-6",
        width === "default" && "max-w-[1240px]",
        width === "wide" && "max-w-[1480px]",
        width === "narrow" && "max-w-[860px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Barra de ferramentas: filtros à esquerda, ações à direita. */
export function Toolbar({ children, actions, className }: { children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Lista com linhas separadas por hairline, dentro de um card. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cx("flex flex-col divide-y divide-line-soft", className)}>{children}</ul>;
}

export interface ListRowProps {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Destaque sutil (item selecionado). */
  selected?: boolean;
}

export function ListRow({ title, description, leading, trailing, onClick, className, selected }: ListRowProps) {
  const content = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-fg">{title}</span>
        {description && <span className="mt-0.5 block truncate text-xs text-fg-3">{description}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2 text-xs text-fg-3">{trailing}</span>}
    </>
  );
  return (
    <li className={cx("min-w-0", className)}>
      {onClick ? (
        <button type="button" onClick={onClick} className={cx("flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover", selected && "bg-selected")}>
          {content}
        </button>
      ) : (
        <div className={cx("flex min-w-0 items-center gap-3 px-4 py-2.5", selected && "bg-selected")}>{content}</div>
      )}
    </li>
  );
}
