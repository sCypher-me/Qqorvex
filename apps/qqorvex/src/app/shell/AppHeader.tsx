import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHojeSummary, type HojePriority } from "@qqorvex/module-hoje";
import { useCurrentPageMeta } from "./PageMeta";
import { BRAND_ASSETS, MODULE_LABELS } from "./navigation";

const ATTENTION: HojePriority[] = ["urgente", "importante", "atencao"];

const PRIORITY_DOT: Record<HojePriority, string> = {
  urgente: "bg-error",
  importante: "bg-warning",
  atencao: "bg-warning",
  informativo: "bg-vex-cyan",
};

/**
 * Cabeçalho fixo do shell (Design System v1.0): título/subtítulo da página, busca que abre a
 * paleta de comandos, notificações (itens da Hoje que pedem atenção) e "Falar com a Vex".
 */
export function AppHeader({ onOpenPalette, onToggleVex }: { onOpenPalette: () => void; onToggleVex: () => void }) {
  const { title, subtitle } = useCurrentPageMeta();
  const { summary } = useHojeSummary();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const attentionItems = summary.items.filter((item) => item.priority && ATTENTION.includes(item.priority));

  useEffect(() => {
    if (!notificationsOpen) return;
    function handleClick(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen]);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 flex-wrap px-4 lg:px-[26px] py-4 border-b border-[rgba(50,57,68,.7)] bg-[linear-gradient(180deg,rgba(14,17,22,.86),rgba(11,14,18,.72))] backdrop-blur-[20px]">
      <div className="flex flex-col gap-[3px] min-w-0 flex-[1_1_200px]">
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.015em] truncate m-0">{title}</h1>
        {subtitle && <span className="text-xs text-text-muted truncate">{subtitle}</span>}
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="qv-well flex items-center gap-2 px-3 py-2 flex-[0_1_240px] min-w-[110px] cursor-pointer hover:border-text-muted text-left"
      >
        <span className="text-text-muted text-[13px] truncate">Buscar</span>
        <span className="flex-1" />
        <span className="font-mono text-[11px] text-text-muted border border-border rounded-md px-1.5 py-px">
          {isMac ? "⌘K" : "Ctrl K"}
        </span>
      </button>

      <div className="relative shrink-0" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setNotificationsOpen((v) => !v)}
          aria-expanded={notificationsOpen}
          className="qv-well relative px-3 py-[9px] text-text-secondary text-[13px] cursor-pointer whitespace-nowrap hover:text-text-primary"
        >
          Notificações
          {attentionItems.length > 0 && (
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-warning" aria-label={`${attentionItems.length} pendentes`} />
          )}
        </button>
        {notificationsOpen && (
          <div className="qv-popover absolute right-0 top-[calc(100%+8px)] w-[340px] p-1.5 z-30 animate-overlay-in">
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
              <span className="text-sm font-semibold flex-1">Pede sua atenção</span>
              <span className="font-mono text-[11px] text-text-muted">{attentionItems.length}</span>
            </div>
            {attentionItems.length === 0 ? (
              <p className="px-3 pb-3 text-[13px] text-text-secondary leading-relaxed">
                Nada urgente agora. Itens vencidos ou importantes dos módulos aparecem aqui.
              </p>
            ) : (
              <div className="flex flex-col max-h-[360px] overflow-y-auto">
                {attentionItems.map((item) => (
                  <button
                    key={`${item.source}-${item.id}`}
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(`/${item.source}`);
                    }}
                    className="flex gap-3 items-start text-left px-3 py-2.5 rounded-[10px] hover:bg-white/5 cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[item.priority!]}`} />
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold truncate">{item.title}</span>
                      <span className="text-xs text-text-muted">
                        {MODULE_LABELS[item.source] ?? item.source}
                        {item.time ? ` · ${item.time}` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleVex}
        className="hidden lg:flex qv-btn qv-btn-vex py-2 px-3.5 shrink-0"
      >
        <img src={BRAND_ASSETS.vexAvatar} alt="" className="w-[22px] h-[22px] rounded-full object-cover" />
        Falar com a Vex
      </button>
    </header>
  );
}
