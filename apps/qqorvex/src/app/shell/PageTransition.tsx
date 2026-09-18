import { Outlet, useLocation } from "react-router-dom";

/**
 * Reanima a cada navegação (a chave por `pathname` força remount, inclusive entre rotas com o
 * mesmo componente e param diferente — ex.: trocar de caderno em `/estudos/:notebookId`). Só
 * entrada, sem saída: `react-router` já desmonta a página antiga antes de montar a nova, então uma
 * transição de saída exigiria manter as duas montadas ao mesmo tempo (fora do escopo — precisaria
 * de uma lib como `framer-motion`, que o projeto não usa).
 */
export function PageTransition() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="flex flex-col gap-[22px] animate-page-in">
      <Outlet />
    </div>
  );
}
