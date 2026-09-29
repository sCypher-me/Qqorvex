import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Estado compartilhado entre o painel lateral e a tela `/vex`: qual conversa está aberta e,
 * opcionalmente, uma pergunta pendente vinda de outro lugar do app (paleta de comandos, botões
 * "Pedir à Vex"). A conversa consome `pendingPrompt` e o limpa.
 */
interface VexSessionValue {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
}

const VexSessionContext = createContext<VexSessionValue | null>(null);

export function VexSessionProvider({ children }: { children: ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const value = useMemo(
    () => ({ activeConversationId, setActiveConversationId, pendingPrompt, setPendingPrompt }),
    [activeConversationId, pendingPrompt],
  );
  return <VexSessionContext.Provider value={value}>{children}</VexSessionContext.Provider>;
}

export function useVexSession(): VexSessionValue {
  const context = useContext(VexSessionContext);
  if (!context) throw new Error("useVexSession precisa estar dentro de VexSessionProvider");
  return context;
}
