import type { ReactNode } from "react";
import { DotsThreeIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { DropdownMenu, IconButton, cx, type MenuEntry } from "@qqorvex/ui";

/** Moldura comum dos painéis de Vida Prática: cabeçalho com ícone, contagem, resumo e botão de adicionar. */
export function PanelShell({
  icon,
  title,
  meta,
  summary,
  addLabel,
  formOpen,
  onToggleForm,
  form,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  /** Linha curta abaixo do título (ex.: total estimado). */
  summary?: ReactNode;
  addLabel?: string;
  formOpen?: boolean;
  onToggleForm?: () => void;
  form?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("min-w-0 overflow-hidden rounded-xl border border-line bg-surface", className)} aria-label={title}>
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2 [&_svg]:size-[17px]" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-[14px] font-semibold text-fg">{title}</h2>
            {meta !== undefined && meta !== null && <span className="text-xs tabular-nums text-fg-3">{meta}</span>}
          </div>
          {summary && <p className="truncate text-xs text-fg-3">{summary}</p>}
        </div>
        {onToggleForm && addLabel && (
          <IconButton label={formOpen ? "Fechar formulário" : addLabel} variant={formOpen ? "subtle" : "ghost"} size="sm" onClick={onToggleForm} aria-expanded={formOpen}>
            {formOpen ? <XIcon /> : <PlusIcon weight="bold" />}
          </IconButton>
        )}
      </header>
      {formOpen && form && <div className="border-t border-line-soft bg-canvas/40 px-4 py-3">{form}</div>}
      <div className="border-t border-line-soft">{children}</div>
    </section>
  );
}

/** Linha de lista com ação de excluir que aparece no hover (sempre visível no toque). */
export function PanelRow({ children, onDelete, deleteLabel, className }: { children: ReactNode; onDelete?: () => void; deleteLabel?: string; className?: string }) {
  return (
    <li className={cx("group flex min-w-0 items-center gap-3 px-4 py-2.5", className)}>
      {children}
      {onDelete && (
        <IconButton label={deleteLabel ?? "Excluir"} variant="danger" size="xs" onClick={onDelete} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
          <XIcon />
        </IconButton>
      )}
    </li>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-5 text-center text-[13px] leading-relaxed text-fg-3">{children}</p>;
}

/** Menu "⋯" de ações de um cartão. */
export function KebabMenu({ label, items }: { label: string; items: MenuEntry[] }) {
  return (
    <DropdownMenu
      label={label}
      items={items}
      trigger={(props) => (
        <button type="button" {...props} aria-label={label} className="-mr-1.5 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg">
          <DotsThreeIcon size={18} weight="bold" />
        </button>
      )}
    />
  );
}

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
