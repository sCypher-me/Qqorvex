import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Fase 2 do Context Engine: painel retrátil e página `/vex` são dois pontos de entrada pra mesma
 * conversa. O histórico já é compartilhado automaticamente (ambos leem `vex_conversations` do
 * banco) — o que precisa ser compartilhado explicitamente é *qual* conversa está aberta agora,
 * pra abrir o painel na conversa X e depois ir pra `/vex` sem trocar de contexto.
 */
interface VexSessionValue {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const VexSessionContext = createContext<VexSessionValue | null>(null);

export function VexSessionProvider({ children }: { children: ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  return (
    <VexSessionContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </VexSessionContext.Provider>
  );
}

export function useVexSession(): VexSessionValue {
  const context = useContext(VexSessionContext);
  if (!context) throw new Error("useVexSession precisa estar dentro de VexSessionProvider");
  return context;
}
