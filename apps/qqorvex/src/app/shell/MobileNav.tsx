import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import type { SidebarSection } from "@qqorvex/ui";

/** Os 4 destinos de uso diário — o resto mora atrás de "Mais". Vex entra aqui de propósito: é o item que mais pede acesso rápido em qualquer tela. */
const PRIMARY_ITEMS = [
  { label: "Hoje", to: "/" },
  { label: "Tarefas", to: "/tarefas" },
  { label: "Agenda", to: "/agenda" },
];

/**
 * Barra inferior fixa (só `<lg`, ver `ProtectedLayout.tsx`) — padrão de app nativo Android/iOS,
 * não de site responsivo, já que o Qqorvex agora também vira APK de verdade. "Mais" abre a mesma
 * lista completa de seções da Sidebar num painel deslizando de baixo pra cima.
 */
export function MobileBottomNav({ onOpenVex, onOpenMore }: { onOpenVex: () => void; onOpenMore: () => void }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch border-t border-[rgba(50,57,68,.85)] bg-[linear-gradient(180deg,rgba(14,17,22,.94),rgba(9,11,14,.98))] backdrop-blur-[20px] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      {PRIMARY_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end className="flex-1 min-w-0">
          {({ isActive }) => (
            <span
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150 ${
                isActive ? "text-vex-cyan-bright" : "text-text-secondary"
              }`}
            >
              <span className={`w-5 h-[3px] rounded-full ${isActive ? "bg-vex-cyan-bright shadow-[0_0_10px_rgba(114,216,235,.6)]" : "bg-transparent"}`} />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </span>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={onOpenVex} className="flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-vex-cyan-bright cursor-pointer">
        <span className="w-5 h-[3px] rounded-full bg-transparent" />
        <span className="truncate max-w-full px-1">Vex</span>
      </button>
      <button type="button" onClick={onOpenMore} className="flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-text-secondary cursor-pointer">
        <span className="w-5 h-[3px] rounded-full bg-transparent" />
        <span className="truncate max-w-full px-1">Mais</span>
      </button>
    </nav>
  );
}

/**
 * Painel "Mais" — a mesma lista de seções da Sidebar, deslizando de baixo pra cima. Fecha ao
 * navegar (cada link chama `onClose`) ou ao tocar no fundo escurecido.
 */
const SHEET_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MoreSheet({ sections, isOpen, onClose }: { sections: SidebarSection[]; isOpen: boolean; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(SHEET_FOCUSABLE_SELECTOR));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>(SHEET_FOCUSABLE_SELECTOR)?.focus();

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Mais opções">
      <div className="qv-backdrop absolute inset-0" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative bg-[linear-gradient(180deg,rgba(34,40,49,.98),rgba(19,23,28,.99))] border-t border-[rgba(58,66,78,.9)] rounded-t-[20px] max-h-[80vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+16px)] animate-overlay-in"
      >
        <div className="w-9 h-1 rounded-full bg-vex-border mx-auto mt-3 mb-1" />
        <div className="flex flex-col gap-4 p-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-[3px]">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted px-2 py-1.5">{section.title}</span>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={!item.matchChildren} onClick={onClose}>
                  {({ isActive }) => (
                    <span
                      className={`flex items-center gap-[11px] w-full rounded-[11px] p-3 text-sm font-medium ${
                        isActive
                          ? "text-vex-cyan-bright bg-[linear-gradient(90deg,rgba(67,185,210,.16),rgba(67,185,210,.04))]"
                          : "text-text-secondary"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
