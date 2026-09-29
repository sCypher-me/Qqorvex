import type { ReactNode } from "react";
import { cx } from "@qqorvex/ui";

/** Cabeçalho de uma seção de Configurações (título grande + explicação curta). */
export function SettingsHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Cartão de configuração: título, descrição opcional, selo à direita e conteúdo. */
export function SettingsCard({
  title,
  description,
  aside,
  children,
  footer,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx("min-w-0 scroll-mt-20 rounded-xl border border-line bg-surface", className)}>
      <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold text-fg">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-3">{description}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      {children && <div className="flex flex-col gap-3 px-4 pb-4 pt-3 sm:px-5">{children}</div>}
      {!children && <div className="pb-4" />}
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-4 py-3 sm:px-5">{footer}</footer>}
    </section>
  );
}

/** Lista de linhas dentro de um SettingsCard. */
export function SettingsList({ children }: { children: ReactNode }) {
  return <ul className="-mx-4 flex flex-col divide-y divide-line-soft border-y border-line-soft last:-mb-4 last:border-b-0 sm:-mx-5">{children}</ul>;
}

export function SettingsListRow({ leading, title, description, trailing }: { leading?: ReactNode; title: ReactNode; description?: ReactNode; trailing?: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-fg">{title}</div>
        {description && <div className="mt-0.5 text-xs leading-snug text-fg-3">{description}</div>}
      </div>
      {trailing && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{trailing}</div>}
    </li>
  );
}

export function IconTile({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "gold" | "warning" }) {
  return (
    <span
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-lg [&_svg]:size-[18px]",
        tone === "success" ? "bg-success-soft text-success" : tone === "gold" ? "bg-gold-soft text-gold-fg" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-hover text-fg-2",
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export function relativeTime(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}
