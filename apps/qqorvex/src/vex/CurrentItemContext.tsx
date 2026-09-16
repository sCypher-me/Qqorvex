import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fase 3 do Context Engine: "a Vex deve saber exatamente qual item, não só a página/módulo".
 * Nenhum módulo tem tela de detalhe hoje — o gatilho é clicar no corpo do card (Tarefas,
 * Documentos como piloto). O foco nunca sobrevive a uma troca de rota: "em foco" significa
 * literalmente "o que está na tela agora", não um favorito persistente.
 */
export interface CurrentItem {
  type: "tarefa" | "documento";
  id: string;
  label: string;
}

interface CurrentItemValue {
  currentItem: CurrentItem | null;
  setCurrentItem: (item: CurrentItem | null) => void;
}

const CurrentItemContext = createContext<CurrentItemValue | null>(null);

export function CurrentItemProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<CurrentItem | null>(null);
  const location = useLocation();

  useEffect(() => {
    setCurrentItem(null);
  }, [location.pathname]);

  return <CurrentItemContext.Provider value={{ currentItem, setCurrentItem }}>{children}</CurrentItemContext.Provider>;
}

export function useCurrentItem(): CurrentItemValue {
  const context = useContext(CurrentItemContext);
  if (!context) throw new Error("useCurrentItem precisa estar dentro de CurrentItemProvider");
  return context;
}
