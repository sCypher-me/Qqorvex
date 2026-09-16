import { lazy, Suspense, useState } from "react";

/**
 * A Vex monta ferramentas dos 8 módulos de domínio — pesado o bastante pra não valer a pena
 * carregar até o usuário realmente abrir o painel (mesmo motivo que já valia pro modal antigo).
 */
const VexConversationView = lazy(() =>
  import("./VexConversationView").then((m) => ({ default: m.VexConversationView })),
);

/** Aba fixa na borda direita, visível em toda página autenticada — abre um painel deslizante com a Vex. */
export function VexPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-brand-cyan text-background font-display font-semibold px-2 py-4 rounded-l-md [writing-mode:vertical-rl] hover:brightness-110"
      >
        Vex
      </button>

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm p-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {open && (
          <Suspense fallback={null}>
            <VexConversationView onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </div>
    </>
  );
}
