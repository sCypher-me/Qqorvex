import { Outlet, useLocation } from "react-router-dom";
import { RequireAuth } from "@qqorvex/auth";
import { Sidebar, type SidebarSection } from "@qqorvex/ui";
import { VexSessionProvider } from "../vex/VexSessionContext";
import { CurrentItemProvider } from "../vex/CurrentItemContext";
import { VexPanel } from "../vex/VexPanel";

/** Docs/decisions/design-system-componentes-v1.md — sem ícones, seções agrupando os 9+ módulos. */
const NAV_SECTIONS: SidebarSection[] = [
  { title: "Principal", items: [{ label: "Hoje", to: "/" }] },
  {
    title: "Organização",
    items: [
      { label: "Tarefas", to: "/tarefas" },
      { label: "Agenda", to: "/agenda" },
      { label: "Metas & Hábitos", to: "/metas-habitos" },
    ],
  },
  {
    title: "Conhecimento",
    items: [
      { label: "Estudos", to: "/estudos" },
      { label: "Segundo Cérebro", to: "/segundo-cerebro" },
      { label: "Biblioteca", to: "/biblioteca" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Documentos", to: "/documentos" },
      { label: "Finanças", to: "/financas" },
    ],
  },
  {
    title: "Pessoal",
    items: [
      { label: "Vida Pessoal", to: "/vida-pessoal" },
      { label: "Segurança", to: "/seguranca" },
    ],
  },
];

/**
 * Rota-layout pras páginas autenticadas: antes, cada rota repetia `<RequireAuth>` individualmente
 * e não existia lugar nenhum pra montar algo "presente em toda página". A aba retrátil da Vex
 * (Fase 2 do Context Engine) precisa exatamente disso — daí este layout. Escondida em `/vex`
 * porque lá o chat já ocupa a tela inteira; a aba seria redundante. A `Sidebar` persistente
 * (docs/decisions/design-system-componentes-v1.md) entra pelo mesmo motivo — é estrutural da
 * navegação, não faz sentido montar página por página.
 */
export function ProtectedLayout() {
  const location = useLocation();
  const isVexPage = location.pathname === "/vex";

  return (
    <RequireAuth>
      <VexSessionProvider>
        <CurrentItemProvider>
          {isVexPage ? (
            <Outlet />
          ) : (
            <div className="flex">
              <Sidebar sections={NAV_SECTIONS} />
              <div className="flex-1 min-w-0">
                <Outlet />
              </div>
            </div>
          )}
          {!isVexPage && <VexPanel />}
        </CurrentItemProvider>
      </VexSessionProvider>
    </RequireAuth>
  );
}
