import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getNavSections } from "./navigation";

interface PaletteEntry {
  group: string;
  label: string;
  run: () => void;
}

/**
 * Paleta de comandos (⌘K / Ctrl+K) — design "Sobreposições › Paleta de comandos". Por enquanto
 * cobre navegação entre módulos e abrir a Vex; Esc fecha, setas escolhem, Enter executa.
 */
export function CommandPalette({
  isOpen,
  onClose,
  onOpenVex,
  isOwner = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenVex: () => void;
  isOwner?: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const entries = useMemo<PaletteEntry[]>(
    () => [
      ...getNavSections(isOwner).flatMap((section) =>
        section.items.map((item) => ({ group: "Ir para", label: item.label, run: () => navigate(item.to) })),
      ),
      { group: "Vex", label: "Falar com a Vex", run: onOpenVex },
      { group: "Vex", label: "Abrir conversa em tela cheia", run: () => navigate("/vex") },
    ],
    [navigate, onOpenVex, isOwner],
  );

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? entries.filter((entry) => `${entry.group} ${entry.label}`.toLowerCase().includes(normalized))
    : entries;

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const wasInert = root?.hasAttribute("inert") ?? false;
    root?.setAttribute("inert", "");
    requestAnimationFrame(() => inputRef.current?.focus());
    function handleDialogKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
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
    document.addEventListener("keydown", handleDialogKey);
    return () => {
      document.removeEventListener("keydown", handleDialogKey);
      if (!wasInert) root?.removeAttribute("inert");
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  function execute(entry: PaletteEntry | undefined) {
    if (!entry) return;
    onClose();
    entry.run();
  }

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] pb-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <div className="qv-backdrop absolute inset-0" onClick={onClose} />
      <div className="qv-dialog relative w-full max-w-[640px] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/80 bg-surface-1/70 px-4 py-3.5 sm:px-5">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-vex-cyan-dark/70 bg-chip-cyan text-vex-cyan-bright">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") execute(filtered[activeIndex]);
            }}
            placeholder="Buscar ou executar"
            aria-label="Buscar ou executar"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-[7px] border border-border bg-surface-2/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
          >
            esc
          </button>
        </div>
        <div className="max-h-[min(520px,62dvh)] overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-4 text-sm leading-relaxed text-text-secondary">Nada encontrado para “{query}”. Tente buscar um módulo ou comando da Vex.</p>}
          {filtered.map((entry, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={`${entry.group}-${entry.label}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => execute(entry)}
                className={`w-full text-left flex items-center gap-3 rounded-[11px] border-l-2 px-3 py-3 cursor-pointer transition-[background-color,border-color,color] ${
                  active ? "border-vex-cyan bg-chip-cyan" : "border-transparent bg-transparent hover:bg-chip-neutral"
                }`}
              >
                <span className="qv-eyebrow w-20 shrink-0">{entry.group}</span>
                <span className={`flex-1 text-sm ${active ? "text-vex-cyan-bright" : "text-text-primary"}`}>{entry.label}</span>
                {active && <span className="font-mono text-[11px] text-text-muted">↵</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
