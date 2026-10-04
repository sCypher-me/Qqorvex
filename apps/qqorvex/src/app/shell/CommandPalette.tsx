import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BooksIcon,
  CalendarBlankIcon,
  CardsThreeIcon,
  CheckSquareIcon,
  CurrencyCircleDollarIcon,
  FileTextIcon,
  GraduationCapIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  NotebookIcon,
  NotePencilIcon,
  RepeatIcon,
  SparkleIcon,
  SunIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { SEARCH_KINDS, searchEverything, type SearchKind } from "@qqorvex/database";
import { Kbd, Spinner, cx } from "@qqorvex/ui";
import { useAccount } from "../account";
import { supabase } from "../supabase";
import { useTheme } from "../ThemeContext";
import { ACCOUNT_LINKS, AREAS, HOME, VEX } from "./navigation";
import { QUICK_CREATE_OPTIONS, QUICK_CREATE_TITLES, useQuickCreate } from "./QuickCreate";
import { SEARCH_GROUP_LABEL, searchResultMeta, searchResultRoute } from "./searchRoutes";

interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  /** Segunda linha, sob o título (ex.: trecho do conteúdo onde o termo apareceu). */
  detail?: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const SEARCH_ICON: Record<SearchKind, ReactNode> = {
  tarefa: <CheckSquareIcon />,
  evento: <CalendarBlankIcon />,
  nota: <NotebookIcon />,
  resumo: <NotePencilIcon />,
  flashcard: <CardsThreeIcon />,
  caderno: <GraduationCapIcon />,
  meta: <TargetIcon />,
  habito: <RepeatIcon />,
  biblioteca: <BooksIcon />,
  documento: <FileTextIcon />,
  lancamento: <CurrencyCircleDollarIcon />,
  ideia: <LightbulbIcon />,
};

/**
 * Busca nos dados do usuário — títulos e conteúdo, sem acento, até 5 por tipo, agrupada na ordem
 * de `SEARCH_KINDS`. O Cofre nunca aparece (regra da função `search_everything` no banco).
 */
async function searchData(term: string): Promise<Array<Omit<PaletteEntry, "run"> & { to: string }>> {
  const results = await searchEverything(supabase, term);
  return results
    .sort((a, b) => SEARCH_KINDS.indexOf(a.kind) - SEARCH_KINDS.indexOf(b.kind))
    .map((result) => ({
      id: `${result.kind}-${result.id}`,
      group: SEARCH_GROUP_LABEL[result.kind],
      label: result.title || "Sem título",
      ...searchResultMeta(result),
      icon: SEARCH_ICON[result.kind],
      to: searchResultRoute(result),
    }));
}

/** Paleta de comandos (⌘K): navegar, criar, falar com a Vex e buscar nos seus dados. */
export function CommandPalette({ isOpen, onClose, onOpenVex }: { isOpen: boolean; onClose: () => void; onOpenVex: (prompt?: string) => void }) {
  const navigate = useNavigate();
  const { isOwner } = useAccount();
  const { theme, toggleTheme } = useTheme();
  const quickCreate = useQuickCreate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState<PaletteEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const staticEntries = useMemo<PaletteEntry[]>(() => {
    const entries: PaletteEntry[] = [
      ...QUICK_CREATE_OPTIONS.map((option) => ({
        id: `create-${option.kind}`,
        group: "Criar",
        label: QUICK_CREATE_TITLES[option.kind],
        icon: option.icon,
        keywords: "criar adicionar novo nova",
        run: () => quickCreate.open(option.kind),
      })),
      { id: "vex", group: "Vex", label: "Perguntar à Vex", icon: <SparkleIcon />, keywords: "ia assistente chat", run: () => onOpenVex() },
      { id: "nav-home", group: "Ir para", label: HOME.label, hint: HOME.description, icon: <HOME.icon />, run: () => navigate(HOME.to) },
      ...AREAS.flatMap((area) =>
        area.sections.map((section) => ({
          id: `nav-${section.key}`,
          group: "Ir para",
          label: section.label,
          hint: area.label,
          icon: <section.icon />,
          keywords: `${area.label} ${section.description}`,
          run: () => navigate(section.to),
        })),
      ),
      { id: "nav-vex", group: "Ir para", label: "Vex em tela cheia", icon: <VEX.icon />, run: () => navigate(VEX.to) },
      ...ACCOUNT_LINKS.filter((link) => !link.ownerOnly || isOwner).map((link) => ({ id: `nav-${link.key}`, group: "Conta", label: link.label, icon: <link.icon />, run: () => navigate(link.to) })),
      { id: "theme", group: "Preferências", label: theme === "dark" ? "Usar tema claro" : "Usar tema escuro", icon: theme === "dark" ? <SunIcon /> : <MoonIcon />, keywords: "tema aparência escuro claro", run: toggleTheme },
    ];
    return entries;
  }, [isOwner, navigate, onOpenVex, quickCreate, theme, toggleTheme]);

  const term = normalize(query.trim());
  const filteredStatic = term ? staticEntries.filter((entry) => normalize(`${entry.group} ${entry.label} ${entry.hint ?? ""} ${entry.keywords ?? ""}`).includes(term)) : staticEntries;
  const askVex: PaletteEntry | null = query.trim().length > 2 ? { id: "ask-vex", group: "Vex", label: `Perguntar à Vex: “${query.trim()}”`, icon: <SparkleIcon />, run: () => onOpenVex(query.trim()) } : null;
  const entries = [...filteredStatic, ...dataResults, ...(askVex ? [askVex] : [])];

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setDataResults([]);
    setActiveIndex(0);
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
    const value = query.trim();
    if (value.length < 2) {
      setDataResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchData(value)
        .then((results) => {
          if (cancelled) return;
          setDataResults(results.map((result) => ({ ...result, run: () => navigate(result.to) })));
        })
        .catch(() => {
          if (!cancelled) setDataResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, navigate]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  function execute(entry: PaletteEntry | undefined) {
    if (!entry) return;
    onClose();
    entry.run();
  }

  let lastGroup = "";
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pb-6 pt-[10vh] sm:px-6" role="dialog" aria-modal="true" aria-label="Buscar e comandos">
      <div className="absolute inset-0 animate-fade-in bg-[var(--q-scrim)] backdrop-blur-[3px]" onClick={onClose} />
      <div
        className="relative flex max-h-[min(620px,80dvh)] w-full max-w-[640px] animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-overlay shadow-lg"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") event.preventDefault();
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          {searching ? <Spinner size={18} className="text-fg-3" /> : <MagnifyingGlassIcon size={18} className="shrink-0 text-fg-3" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, entries.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                execute(entries[activeIndex]);
              }
            }}
            placeholder="Buscar tarefas, notas, eventos… ou digite um comando"
            aria-label="Buscar ou executar comando"
            aria-controls="command-palette-list"
            aria-activedescendant={entries[activeIndex] ? `cmd-${entries[activeIndex]!.id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-4"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id="command-palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 && !searching && (
            <p className="px-3 py-8 text-center text-[13px] text-fg-3">Nada encontrado para “{query}”.</p>
          )}
          {entries.map((entry, index) => {
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;
            const active = index === activeIndex;
            return (
              <div key={entry.id}>
                {showGroup && <p className="px-2.5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-4 first:pt-1">{entry.group}</p>}
                <button
                  id={`cmd-${entry.id}`}
                  data-index={index}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => execute(entry)}
                  className={cx(
                    "flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13.5px] transition-colors [&_svg]:size-[18px] [&_svg]:shrink-0",
                    active ? "bg-selected text-fg" : "text-fg-2",
                  )}
                >
                  <span className={cx("flex", active ? "text-gold-fg" : "text-fg-4", entry.group === "Vex" && "text-ai-fg")}>{entry.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{entry.label}</span>
                    {entry.detail && <span className="block truncate text-xs text-fg-4">{entry.detail}</span>}
                  </span>
                  {entry.hint && <span className="shrink-0 text-xs text-fg-4">{entry.hint}</span>}
                  {active && <span className="shrink-0 text-xs text-fg-4">↵</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-2xs text-fg-4 sm:flex">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> abrir</span>
          <span className="flex items-center gap-1.5"><Kbd>C</Kbd> nova tarefa</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
