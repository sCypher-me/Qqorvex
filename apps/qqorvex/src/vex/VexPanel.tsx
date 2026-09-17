import { lazy, Suspense } from "react";

/**
 * A Vex monta ferramentas dos 8 módulos de domínio — pesado o bastante pra não valer a pena
 * carregar até o usuário realmente abrir o painel (mesmo motivo que já valia pro modal antigo).
 */
const VexConversationView = lazy(() =>
  import("./VexConversationView").then((m) => ({ default: m.VexConversationView })),
);

/**
 * Painel da Vex (Design System v1.0): coluna de 372px à direita do conteúdo em telas grandes,
 * aberta pelo botão "Falar com a Vex" do cabeçalho ou pela aba "Vex" da barra inferior mobile.
 * Em `<lg` vira sobreposição de tela cheia — 372px fixo não cabe num celular.
 */
export function VexPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="fixed inset-0 lg:static lg:w-[372px] lg:shrink-0 h-screen lg:sticky lg:top-0 border-l border-border bg-vex-obsidian flex flex-col animate-vex-in z-40 lg:z-10">
      <Suspense
        fallback={<p className="p-5 text-sm text-text-secondary">Abrindo a Vex...</p>}
      >
        <VexConversationView variant="panel" onClose={onClose} />
      </Suspense>
    </aside>
  );
}
