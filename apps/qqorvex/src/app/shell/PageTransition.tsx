import { Outlet, useLocation } from "react-router-dom";

/** Entrada suave a cada troca de rota (chave por pathname força o remount). */
export function PageTransition() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="flex min-h-0 min-w-0 flex-1 animate-fade-up flex-col">
      <Outlet />
    </div>
  );
}
