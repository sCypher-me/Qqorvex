import { lazy, Suspense, useEffect, useRef, type KeyboardEvent } from "react";
import { Skeleton } from "@qqorvex/ui";

const VexConversationView = lazy(() => import("./VexConversationView").then((m) => ({ default: m.VexConversationView })));

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col" role="status" aria-label="Abrindo a conversa com a Vex" aria-busy="true">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-16 w-[85%] rounded-xl" />
        <Skeleton className="h-10 w-[60%] self-end rounded-xl" />
      </div>
      <div className="border-t border-line p-3">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Painel lateral da Vex (desktop). Em telas largas divide o espaço com o conteúdo; em telas
 * médias sobrepõe. Esc fecha e o foco volta para quem abriu.
 */
export function VexPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-vex-initial-focus]")?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    returnFocus.current?.focus();
    returnFocus.current = null;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside
      ref={panelRef}
      id="vex-side-panel"
      aria-label="Conversa com a Vex"
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-y-0 right-0 z-40 hidden w-[min(var(--q-vex-panel-width),calc(100vw-80px))] animate-slide-in-right flex-col border-l border-line bg-surface shadow-lg lg:flex xl:sticky xl:top-0 xl:z-auto xl:h-dvh xl:shrink-0 xl:shadow-none"
    >
      <Suspense fallback={<PanelSkeleton />}>
        <VexConversationView variant="panel" onClose={onClose} />
      </Suspense>
    </aside>
  );
}
