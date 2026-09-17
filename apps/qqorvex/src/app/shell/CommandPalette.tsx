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
    requestAnimationFrame(() => inputRef.current?.focus());
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
    <div className="fixed inset-0 z-50 flex items-start justify-center px-6 pt-24 pb-6" role="dialog" aria-modal="true">
      <div className="qv-backdrop absolute inset-0" onClick={onClose} />
      <div className="qv-dialog relative w-full max-w-[560px] overflow-hidden">
        <div className="flex items-center gap-3 px-[18px] py-4 border-b border-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
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
            className="flex-1 bg-transparent border-none outline-none text-base text-text-primary focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="border border-border rounded-lg text-text-muted font-mono text-[11px] px-[7px] py-[3px] cursor-pointer hover:text-text-primary"
          >
            esc
          </button>
        </div>
        <div className="p-2 max-h-[420px] overflow-y-auto">
          {filtered.length === 0 && <p className="px-3 py-3 text-sm text-text-secondary">Nada encontrado para “{query}”.</p>}
          {filtered.map((entry, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={`${entry.group}-${entry.label}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => execute(entry)}
                className={`w-full text-left flex items-center gap-3 px-3 py-[11px] rounded-[10px] cursor-pointer ${
                  active ? "bg-[rgba(67,185,210,.10)]" : "bg-transparent"
                }`}
              >
                <span className="qv-eyebrow w-24 shrink-0">{entry.group}</span>
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
