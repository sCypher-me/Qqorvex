import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "../cx";

export interface TabOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Contagem à direita do rótulo. */
  count?: number | null;
  disabled?: boolean;
}

function useRovingTabs<T extends string>(options: TabOption<T>[], onChange: (value: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabled = options.map((option, i) => (option.disabled ? -1 : i)).filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    let next: number | undefined;
    if (event.key === "ArrowRight") next = enabled[(position + 1) % enabled.length];
    if (event.key === "ArrowLeft") next = enabled[(position - 1 + enabled.length) % enabled.length];
    if (event.key === "Home") next = enabled[0];
    if (event.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    const option = options[next];
    if (option) onChange(option.value);
    refs.current[next]?.focus();
  }
  return { refs, onKeyDown };
}

export interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Nome acessível do grupo de abas. */
  label?: string;
  size?: "sm" | "md";
}

/** Abas sublinhadas — navegação entre visões de uma mesma página. */
export function Tabs<T extends string>({ options, value, onChange, className, label, size = "md" }: TabsProps<T>) {
  const { refs, onKeyDown } = useRovingTabs(options, onChange);
  return (
    <div role="tablist" aria-label={label} className={cx("q-scroll-x flex items-center gap-1 border-b border-line", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "relative -mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 font-medium transition-colors duration-150",
              size === "sm" ? "h-9 text-[13px]" : "h-10 text-[13.5px]",
              selected ? "border-gold text-fg" : "border-transparent text-fg-3 hover:text-fg-2",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--q-focus)] disabled:opacity-40 [&_svg]:size-4",
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined && option.count !== null && (
              <span className={cx("rounded px-1 text-2xs tabular-nums", selected ? "bg-gold-soft text-gold-fg" : "bg-hover text-fg-3")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentedProps<T extends string> extends TabsProps<T> {
  fullWidth?: boolean;
}

/** Controle segmentado — alterna modos de visualização (Lista / Quadro / Calendário). */
export function Segmented<T extends string>({ options, value, onChange, className, label, size = "md", fullWidth = false }: SegmentedProps<T>) {
  const { refs, onKeyDown } = useRovingTabs(options, onChange);
  return (
    <div role="tablist" aria-label={label} className={cx("inline-flex max-w-full items-center gap-0.5 rounded-lg border border-line bg-canvas/50 p-0.5", fullWidth && "flex w-full", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 font-medium transition-[background-color,color] duration-150",
              size === "sm" ? "h-7 text-xs" : "h-8 text-[13px]",
              fullWidth && "flex-1",
              selected ? "bg-raised text-fg shadow-sm" : "text-fg-3 hover:text-fg-2",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--q-focus)] disabled:opacity-40 [&_svg]:size-4",
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined && option.count !== null && <span className="text-2xs tabular-nums text-fg-3">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated use `Segmented` (mesma API). */
export function ChipTabs<T extends string>(props: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; className?: string }) {
  return <Segmented {...props} />;
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  count?: number;
}

/** Chip de filtro em pílula. */
export function Chip({ active = false, icon, count, className, type = "button", children, ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium transition-colors duration-150",
        active ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] [&_svg]:size-3.5",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  );
}

export interface NavTab {
  to: string;
  label: ReactNode;
  icon?: ReactNode;
  end?: boolean;
  count?: number | null;
}

/** Abas que são rotas (sub-navegação de uma área). */
export function NavTabs({ tabs, className, label }: { tabs: NavTab[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cx("q-scroll-x flex items-center gap-1 border-b border-line", className)}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cx(
              "relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-[13.5px] font-medium transition-colors duration-150",
              isActive ? "border-gold text-fg" : "border-transparent text-fg-3 hover:text-fg-2",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--q-focus)] [&_svg]:size-4",
            )
          }
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && tab.count !== null && <span className="rounded bg-hover px-1 text-2xs tabular-nums text-fg-3">{tab.count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
