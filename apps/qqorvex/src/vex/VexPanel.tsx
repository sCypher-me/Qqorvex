import { lazy, Suspense } from "react";

/**
 * A Vex monta ferramentas dos 8 módulos de domínio — pesado o bastante pra não valer a pena
 * carregar até o usuário realmente abrir o painel (mesmo motivo que já valia pro modal antigo).
 */
const VexConversationView = lazy(() =>
  import("./VexConversationView").then((m) => ({ default: m.VexConversationView })),
);

/**
 * Painel lateral da Vex (Design System v1.0): coluna de 372px à direita do conteúdo, aberta pelo
 * botão "Falar com a Vex" do cabeçalho. Fica fixa na altura da tela enquanto a página rola.
 */
export function VexPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="w-[372px] shrink-0 h-screen sticky top-0 border-l border-border bg-vex-obsidian flex flex-col animate-vex-in z-10">
      <Suspense
        fallback={<p className="p-5 text-sm text-text-secondary">Abrindo a Vex...</p>}
      >
        <VexConversationView variant="panel" onClose={onClose} />
      </Suspense>
    </aside>
  );
}
