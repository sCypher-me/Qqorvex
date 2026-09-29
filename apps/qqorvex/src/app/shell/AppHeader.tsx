import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import { useHojeSummary, type HojePriority } from "@qqorvex/module-hoje";
import { useNotifications } from "@qqorvex/notifications";
import { MODULE_LABELS } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";

const ATTENTION: HojePriority[] = ["urgente", "importante", "atencao"];
const PRIORITY_DOT: Record<HojePriority, string> = {
  urgente: "bg-error",
  importante: "bg-warning",
  atencao: "bg-warning",
  informativo: "bg-brand-primary",
};

export function AppHeader({ onOpenPalette, displayName = "" }: { onOpenPalette: () => void; displayName?: string }) {
  const { client, session } = useAuth();
  const { summary } = useHojeSummary();
  const pushNotifications = useNotifications(client, session!.user.id, import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const attentionItems = summary.items.filter((item) => item.priority && ATTENTION.includes(item.priority));
  const firstName = displayName.trim().split(/\s+/)[0];
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    if (!notificationsOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        notificationsTriggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-2">
      <div className="flex min-h-[70px] min-w-0 items-center gap-2.5 px-3 sm:px-[18px] desktop:min-h-[92px] desktop:gap-3 desktop:px-[54px]">
        <span className="shrink-0 text-[18px] font-bold tracking-[-0.06em] text-text-primary desktop:hidden">Qqorvex</span>
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Buscar no Qqorvex"
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
          className="flex h-10 w-10 min-w-0 shrink-0 items-center justify-center gap-3 rounded-[10px] border border-border text-text-muted transition-colors hover:bg-chip-neutral hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary desktop:h-12 desktop:w-auto desktop:flex-1 desktop:justify-start desktop:border-border desktop:px-4 desktop:text-left desktop:hover:border-text-muted desktop:max-w-[560px]"
        >
          <MagnifyingGlassIcon size={21} aria-hidden="true" />
          <span className="hidden min-w-0 flex-1 truncate text-[14px] desktop:inline">Buscar no Qqorvex...</span>
          <kbd className="hidden shrink-0 rounded-[5px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-text-muted desktop:inline">{isMac ? "⌘ K" : "Ctrl K"}</kbd>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 desktop:gap-2.5">
          <ThemeToggle compact />
          <span className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />
          <button type="button" onClick={() => navigate("/tarefas", { state: { focusCapture: true } })} aria-label="Criar nova tarefa" title="Captura rápida" className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-border text-text-secondary transition-colors hover:border-brand-primary hover:bg-chip-neutral hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary 2xl:w-auto 2xl:px-3"><PlusIcon size={20} aria-hidden="true" /><span className="hidden text-[12px] font-semibold 2xl:inline">Nova tarefa</span></button>
          <div className="relative" ref={popoverRef}>
            <button
              ref={notificationsTriggerRef}
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-expanded={notificationsOpen}
              aria-controls="attention-items-panel"
              aria-label={attentionItems.length ? `Notificações, ${attentionItems.length} itens que pedem atenção` : "Notificações"}
              title="Notificações"
              className="relative grid h-10 w-10 place-items-center rounded-[10px] border border-border text-text-secondary transition-colors hover:border-brand-primary hover:bg-chip-neutral hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <BellIcon size={20} aria-hidden="true" />
              {attentionItems.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-surface-2 bg-brand-primary px-1 font-mono text-[9px] font-bold leading-none text-white">{attentionItems.length > 9 ? "9+" : attentionItems.length}</span>}
            </button>
            {notificationsOpen && (
              <div id="attention-items-panel" role="region" aria-labelledby="attention-items-title" className="qv-popover absolute right-0 top-[calc(100%+10px)] z-30 w-[min(360px,calc(100vw-24px))] p-2">
                <div className="flex items-center gap-2 border-b border-border px-3 pb-3 pt-2"><span id="attention-items-title" className="flex-1 text-sm font-semibold">Atenção agora</span><span className="rounded-full bg-chip-neutral px-2 py-1 font-mono text-[10px] text-text-muted">{attentionItems.length}</span></div>
                {attentionItems.length === 0 ? <p className="px-3 pb-3 text-[13px] leading-relaxed text-text-secondary">Nada urgente agora. Itens vencidos ou importantes aparecem aqui.</p> : (
                  <div className="flex max-h-[360px] flex-col overflow-y-auto">
                    {attentionItems.map((item) => (
                      <button key={`${item.source}-${item.id}`} type="button" onClick={() => { setNotificationsOpen(false); navigate(`/${item.source}`); }} className="flex items-start gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-chip-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[item.priority!]}`} aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[13px] font-semibold">{item.title}</span><span className="text-xs text-text-muted">{MODULE_LABELS[item.source] ?? item.source}{item.time ? ` · ${item.time}` : ""}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                <section className="border-t border-border px-3 py-3" aria-label="Lembretes deste dispositivo">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">Lembretes neste dispositivo</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        {!pushNotifications.supported ? "Notificações push indisponíveis neste navegador" : pushNotifications.isLoading ? "Verificando permissão…" : pushNotifications.isSubscribed ? "Ativos para Agenda e rotina" : "Receba lembretes importantes"}
                      </p>
                    </div>
                    {pushNotifications.supported && !pushNotifications.isLoading && (
                      <button
                        type="button"
                        onClick={() => void (pushNotifications.isSubscribed ? pushNotifications.disable() : pushNotifications.enable())}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        {pushNotifications.isSubscribed ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </div>
                  {pushNotifications.error && <p role="alert" className="mt-2 text-[11px] text-error">{pushNotifications.error}</p>}
                </section>
              </div>
            )}
          </div>
          <span className="hidden min-w-[88px] flex-col gap-0.5 border-l border-border pl-3 text-[10px] leading-tight text-text-muted xl:flex">
            <span>Boa jornada,</span>
            <span className="max-w-[132px] truncate text-[12px] font-semibold text-text-primary">{firstName || "sempre."}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
