import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlusIcon, CheckSquareIcon, CurrencyCircleDollarIcon, NotePencilIcon } from "@phosphor-icons/react";
import { DropdownMenu, type DropdownMenuProps } from "@qqorvex/ui";
import { lazyWithRecovery } from "../updates/webUpdate";

export type QuickCreateKind = "task" | "event" | "transaction" | "note";

export const QUICK_CREATE_OPTIONS: Array<{ kind: QuickCreateKind; label: string; shortcut: string; icon: ReactNode }> = [
  { kind: "task", label: "Tarefa", shortcut: "T", icon: <CheckSquareIcon /> },
  { kind: "event", label: "Evento", shortcut: "E", icon: <CalendarPlusIcon /> },
  { kind: "transaction", label: "Transação", shortcut: "$", icon: <CurrencyCircleDollarIcon /> },
  { kind: "note", label: "Nota", shortcut: "N", icon: <NotePencilIcon /> },
];

export const QUICK_CREATE_TITLES: Record<QuickCreateKind, string> = {
  task: "Nova tarefa",
  event: "Novo evento",
  transaction: "Nova transação",
  note: "Nova nota",
};

const QuickCreateDialog = lazyWithRecovery(() => import("./QuickCreateDialog").then((m) => ({ default: m.QuickCreateDialog })));

interface QuickCreateValue {
  open: (kind: QuickCreateKind, defaults?: { title?: string; date?: string }) => void;
}

const QuickCreateContext = createContext<QuickCreateValue | null>(null);

/**
 * Criação rápida global: tarefa, evento, transação ou nota a partir de qualquer tela (botão "+"
 * da navegação, paleta de comandos ou atalho). Os formulários carregam sob demanda.
 */
export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ kind: QuickCreateKind; defaults?: { title?: string; date?: string } } | null>(null);
  const open = useCallback((kind: QuickCreateKind, defaults?: { title?: string; date?: string }) => setState({ kind, defaults }), []);
  const value = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        setState({ kind: "task" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <QuickCreateContext.Provider value={value}>
      {children}
      {state && (
        <Suspense fallback={null}>
          <QuickCreateDialog kind={state.kind} defaults={state.defaults} onKindChange={(kind) => setState({ kind })} onClose={() => setState(null)} />
        </Suspense>
      )}
    </QuickCreateContext.Provider>
  );
}

export function useQuickCreate(): QuickCreateValue {
  return useContext(QuickCreateContext) ?? { open: () => undefined };
}

/** Botão "+" com o menu do que dá para criar. */
export function QuickCreateMenu({ trigger, placement = "bottom-end" }: { trigger: DropdownMenuProps["trigger"]; placement?: DropdownMenuProps["placement"] }) {
  const { open } = useQuickCreate();
  return (
    <DropdownMenu
      label="Criar novo"
      placement={placement}
      trigger={trigger}
      items={[
        { heading: "Criar" },
        ...QUICK_CREATE_OPTIONS.map((option) => ({ label: option.label, icon: option.icon, onSelect: () => open(option.kind) })),
        "separator",
        { label: "Atalho: tecla C cria uma tarefa", disabled: true },
      ]}
    />
  );
}
