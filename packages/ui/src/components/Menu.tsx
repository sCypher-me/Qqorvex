import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../cx";

type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** Posiciona um elemento flutuante junto ao gatilho, em `position: fixed`, respeitando a viewport. */
function useFloatingPosition(open: boolean, placement: Placement) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    const floating = floatingRef.current;
    if (!trigger || !floating) return;
    const rect = trigger.getBoundingClientRect();
    const width = floating.offsetWidth;
    const height = floating.offsetHeight;
    const gap = 6;
    let top = placement.startsWith("bottom") ? rect.bottom + gap : rect.top - height - gap;
    if (placement.startsWith("bottom") && top + height > window.innerHeight - 8 && rect.top - height - gap > 8) top = rect.top - height - gap;
    if (placement.startsWith("top") && top < 8) top = rect.bottom + gap;
    let left = placement.endsWith("start") ? rect.left : rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setStyle({ top, left, minWidth: rect.width });
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return { triggerRef, floatingRef, style };
}

function useDismiss(open: boolean, onClose: () => void, refs: Array<{ current: HTMLElement | null }>) {
  useEffect(() => {
    if (!open) return;
    function belongsToNestedLayer(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      const layer = target.closest<HTMLElement>("[data-floating-owner-trigger]");
      const triggerId = layer?.dataset.floatingOwnerTrigger;
      const trigger = triggerId
        ? Array.from(document.querySelectorAll<HTMLElement>("[data-floating-trigger-id]")).find((element) => element.dataset.floatingTriggerId === triggerId)
        : null;
      return Boolean(trigger && refs.some((ref) => ref.current?.contains(trigger)));
    }
    function isInsideOpenDialog(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest("dialog[open]"));
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      // Menus/popovers render in portals. Keep their owning layer open while interacting with them.
      if (belongsToNestedLayer(event.target) || isInsideOpenDialog(event.target)) return;
      onClose();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        // A modal or nested menu owns Escape until that topmost layer has closed.
        if (belongsToNestedLayer(event.target) || isInsideOpenDialog(event.target)) return;
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, refs]);
}

export interface PopoverProps {
  /** Render-prop do gatilho: recebe props a espalhar num botão. */
  trigger: (props: { ref: (element: HTMLElement | null) => void; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "dialog" | "menu"; "aria-controls": string }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?: Placement;
  className?: string;
  /** Rótulo acessível do painel. */
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Painel flutuante genérico (filtros, seletores, formulários curtos). */
export function Popover({ trigger, children, placement = "bottom-start", className, label, open: controlledOpen, onOpenChange }: PopoverProps) {
  const id = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [controlledOpen, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const { triggerRef, floatingRef, style } = useFloatingPosition(open, placement);
  const refs = useRef([triggerRef, floatingRef]).current;
  useDismiss(open, close, refs as Array<{ current: HTMLElement | null }>);

  return (
    <>
      {trigger({
        ref: (element) => {
          triggerRef.current = element;
          if (element) element.dataset.floatingTriggerId = id;
        },
        onClick: () => setOpen(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": id,
      })}
      {open &&
        createPortal(
          <div
            ref={floatingRef}
            id={id}
            data-floating-owner-trigger={id}
            role="dialog"
            aria-label={label}
            style={{ position: "fixed", top: style?.top ?? -9999, left: style?.left ?? -9999, zIndex: 70, visibility: style ? "visible" : "hidden" }}
            className={cx("animate-pop-in rounded-xl border border-line bg-overlay p-3 text-fg shadow-md", className)}
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body,
        )}
    </>
  );
}

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  /** Ação destrutiva (vermelha). */
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  /** Texto secundário à direita. */
  hint?: ReactNode;
  checked?: boolean;
}

export type MenuEntry = MenuItem | "separator" | { heading: string };

export interface DropdownMenuProps {
  trigger: (props: { ref: (element: HTMLElement | null) => void; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu"; "aria-controls": string }) => ReactNode;
  items: MenuEntry[];
  placement?: Placement;
  label?: string;
  className?: string;
}

/** Menu de ações (kebab, "Mais opções"). Navegável por setas, Home/End, Enter e Esc. */
export function DropdownMenu({ trigger, items, placement = "bottom-end", label, className }: DropdownMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, floatingRef, style } = useFloatingPosition(open, placement);
  const refs = useRef([triggerRef, floatingRef]).current;
  useDismiss(open, close, refs as Array<{ current: HTMLElement | null }>);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open && style) itemRefs.current.find((element) => element && !element.disabled)?.focus();
  }, [open, style]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = itemRefs.current.filter((element): element is HTMLButtonElement => Boolean(element && !element.disabled));
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    let next: HTMLButtonElement | undefined;
    if (event.key === "ArrowDown") next = enabled[(index + 1) % enabled.length];
    if (event.key === "ArrowUp") next = enabled[(index - 1 + enabled.length) % enabled.length];
    if (event.key === "Home") next = enabled[0];
    if (event.key === "End") next = enabled[enabled.length - 1];
    if (event.key === "Tab") close();
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  let buttonIndex = -1;
  return (
    <>
      {trigger({
        ref: (element) => {
          triggerRef.current = element;
          if (element) element.dataset.floatingTriggerId = id;
        },
        onClick: () => setOpen((value) => !value),
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": id,
      })}
      {open &&
        createPortal(
          <div
            ref={floatingRef}
            id={id}
            data-floating-owner-trigger={id}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            style={{ position: "fixed", top: style?.top ?? -9999, left: style?.left ?? -9999, zIndex: 70, visibility: style ? "visible" : "hidden" }}
            className={cx("min-w-[200px] animate-pop-in rounded-xl border border-line bg-overlay p-1 text-fg shadow-md", className)}
          >
            {items.map((entry, index) => {
              if (entry === "separator") return <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-line" />;
              if ("heading" in entry) {
                return (
                  <div key={`h-${index}`} className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-4">
                    {entry.heading}
                  </div>
                );
              }
              buttonIndex += 1;
              const position = buttonIndex;
              return (
                <button
                  key={index}
                  ref={(element) => {
                    itemRefs.current[position] = element;
                  }}
                  type="button"
                  role={entry.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                  aria-checked={entry.checked}
                  disabled={entry.disabled}
                  onClick={() => {
                    close();
                    triggerRef.current?.focus();
                    entry.onSelect?.();
                  }}
                  className={cx(
                    "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] outline-none transition-colors",
                    entry.danger ? "text-danger hover:bg-danger-soft focus:bg-danger-soft" : "text-fg-2 hover:bg-hover hover:text-fg focus:bg-hover focus:text-fg",
                    "disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
                  )}
                >
                  {entry.icon && <span className={cx("flex", !entry.danger && "text-fg-3")}>{entry.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {entry.checked && <span aria-hidden="true" className="text-gold-fg">✓</span>}
                  {entry.hint && <span className="text-xs text-fg-4">{entry.hint}</span>}
                  {entry.shortcut && <kbd className="q-kbd">{entry.shortcut}</kbd>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Dica flutuante simples (CSS). Use em controles que já têm nome acessível. */
export function Tooltip({ content, children, side = "top", className }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "right"; className?: string }) {
  return (
    <span className={cx("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute z-50 w-max max-w-[240px] rounded-md bg-fg px-2 py-1 text-xs font-medium text-canvas opacity-0 shadow-md transition-opacity delay-300 duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
          side === "bottom" && "left-1/2 top-full mt-1.5 -translate-x-1/2",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
        )}
      >
        {content}
      </span>
    </span>
  );
}
