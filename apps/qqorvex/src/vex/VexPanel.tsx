import { lazy, Suspense, useEffect, useRef, type KeyboardEvent } from "react";

/**
 * A Vex monta ferramentas dos 8 módulos de domínio — pesado o bastante pra não valer a pena
 * carregar até o usuário realmente abrir o painel (mesmo motivo que já valia pro modal antigo).
 */
const VexConversationView = lazy(() =>
  import("./VexConversationView").then((m) => ({ default: m.VexConversationView })),
);

/**
 * Chat da Vex no desktop: um rail independente no lado oposto ao Nav principal.
 * Fica recolhido na borda direita e só abre por uma ação explícita (o próprio rail ou a paleta).
 * O mobile continua usando a rota `/vex` em tela cheia até definirmos sua interação.
 */
export function VexPanel({ isOpen, onOpen, onClose }: { isOpen: boolean; onOpen: () => void; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const focusTarget = panelRef.current?.querySelector<HTMLElement>("[data-vex-initial-focus]");
      window.requestAnimationFrame(() => focusTarget?.focus());
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, [isOpen]);

  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <aside
      ref={panelRef}
      id="vex-side-panel"
      role={isOpen ? "dialog" : undefined}
      aria-label={isOpen ? "Conversa com a Vex" : undefined}
      tabIndex={isOpen ? -1 : undefined}
      onKeyDown={isOpen ? handlePanelKeyDown : undefined}
      className={`fixed inset-y-0 right-0 z-30 hidden min-h-0 flex-col overflow-hidden border-l border-border bg-[var(--qv-surface-canvas)] transition-[width,box-shadow] duration-[240ms] ease-out motion-reduce:transition-none desktop:flex ${isOpen ? "w-[min(360px,calc(100vw-72px))] shadow-[-14px_0_32px_rgb(0_0_0/0.16)]" : "w-[50px] shadow-none"}`}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col bg-surface-1" role="status" aria-label="Abrindo a conversa com a Vex" aria-busy="true">
              <div className="flex items-center gap-3 border-b border-border px-4 py-4">
                <span className="qv-skeleton h-11 w-11 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="qv-skeleton h-3 w-20" />
                  <span className="qv-skeleton h-2.5 w-32" />
                </div>
                <span className="qv-skeleton h-9 w-9 rounded-[10px]" />
              </div>
              <div className="flex flex-1 flex-col gap-3 px-4 py-5">
                <span className="qv-skeleton h-8 w-40 self-center rounded-full" />
                <span className="qv-skeleton h-24 w-[88%] rounded-[17px]" />
                <span className="qv-skeleton h-16 w-[76%] self-end rounded-[17px]" />
              </div>
              <div className="border-t border-border bg-surface-1 p-3.5">
                <span className="qv-skeleton block h-11 w-full rounded-[13px]" />
              </div>
            </div>
          }
        >
          <VexConversationView variant="panel" onClose={onClose} />
        </Suspense>
      ) : (
        <button
          type="button"
          ref={triggerRef}
          onClick={onOpen}
          aria-label="Abrir conversa com a Vex"
          aria-controls="vex-side-panel"
          title="Conversar com a Vex"
          className="relative flex h-full w-full items-center justify-center overflow-hidden border-0 bg-surface-1 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
        >
          <span className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-4 py-5">
            <span className="[writing-mode:vertical-rl] text-[11px] font-bold tracking-[0.1em] text-text-primary">VEX</span>
            <span className="[writing-mode:vertical-rl] text-[9px] uppercase tracking-[0.12em] text-text-muted">Abrir conversa</span>
          </span>
        </button>
      )}
    </aside>
  );
}
