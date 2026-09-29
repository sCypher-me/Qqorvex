import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { ChatTeardropTextIcon, CheckSquareIcon, HouseIcon, RowsIcon, XIcon } from "@phosphor-icons/react";
import { NavIcon, iconForRoute, type SidebarSection } from "@qqorvex/ui";

export function MobileBottomNav({
  onOpenVex,
  onOpenMore,
  vexActive,
  moreOpen,
}: {
  onOpenVex: () => void;
  onOpenMore: () => void;
  vexActive: boolean;
  moreOpen: boolean;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] desktop:hidden" aria-label="Navegação principal">
      <NavLink to="/" end className={({ isActive }) => `flex min-h-[68px] flex-col items-center justify-center gap-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${isActive ? "text-brand-primary" : "text-text-muted"}`}><HouseIcon size={22} aria-hidden="true" />Hoje</NavLink>
      <NavLink to="/tarefas" className={({ isActive }) => `flex min-h-[68px] flex-col items-center justify-center gap-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${isActive ? "text-brand-primary" : "text-text-muted"}`}><CheckSquareIcon size={22} aria-hidden="true" />Tarefas</NavLink>
      <button type="button" onClick={onOpenVex} aria-label={vexActive ? "Conversa com a Vex aberta" : "Falar com a Vex"} aria-pressed={vexActive} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${vexActive ? "text-brand-primary" : "text-text-muted"}`}><ChatTeardropTextIcon size={22} aria-hidden="true" />Vex</button>
      <button type="button" onClick={onOpenMore} aria-label="Explorar todas as áreas" aria-expanded={moreOpen} aria-controls="mobile-nav-panel" className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${moreOpen ? "text-brand-primary" : "text-text-muted"}`}><RowsIcon size={22} aria-hidden="true" />Mais</button>
    </nav>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MoreSheet({ sections, isOpen, onClose }: { sections: SidebarSection[]; isOpen: boolean; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const wasInert = root?.hasAttribute("inert") ?? false;
    root?.setAttribute("inert", "");
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") { onCloseRef.current(); return; }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (!wasInert) root?.removeAttribute("inert");
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col justify-end desktop:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title">
      <button type="button" className="absolute inset-0 border-0 bg-black/60" onClick={onClose} aria-label="Fechar menu" />
      <div id="mobile-nav-panel" ref={sheetRef} className="relative max-h-[88dvh] overflow-y-auto rounded-t-[20px] border-t border-border bg-surface-2 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4">
        <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-center justify-between border-b border-border bg-surface-2 px-5 py-3"><div><p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Navegação</p><h2 id="mobile-nav-title" className="m-0 mt-1 text-[20px] font-bold">Todas as áreas</h2></div><button type="button" onClick={onClose} aria-label="Fechar menu" className="grid h-10 w-10 place-items-center rounded-[10px] border border-border text-text-secondary transition-colors hover:bg-chip-neutral hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"><XIcon size={18} /></button></div>
        {sections.map((section) => <div key={section.title} className="border-t border-border py-3"><h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-text-muted">{section.title}</h3>{section.items.map((item) => <NavLink key={item.to} to={item.to} end={!item.matchChildren} onClick={onClose} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${isActive ? "bg-chip-cyan font-semibold text-brand-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}><NavIcon kind={iconForRoute(item.to)} />{item.label}</NavLink>)}</div>)}
      </div>
    </div>,
    document.body,
  );
}
