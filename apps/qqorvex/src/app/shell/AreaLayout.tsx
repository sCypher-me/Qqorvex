import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { NavTabs } from "@qqorvex/ui";
import { AREAS, type NavArea } from "./navigation";

const LAST_SECTION_KEY = "qqorvex.area.last.";

export function lastSectionFor(area: NavArea): string {
  try {
    const saved = window.localStorage.getItem(LAST_SECTION_KEY + area.key);
    if (saved && area.sections.some((section) => section.to === saved)) return saved;
  } catch {
    // preferência opcional
  }
  return area.sections[0]!.to;
}

/**
 * Casca de uma área (Planejar, Conhecimento, Vida): no celular mostra as abas das seções
 * (no desktop elas ficam na sidebar) e lembra a última seção visitada.
 */
export function AreaLayout({ areaKey }: { areaKey: NavArea["key"] }) {
  const location = useLocation();
  const area = AREAS.find((item) => item.key === areaKey)!;
  const section = area.sections.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    if (!section) return;
    try {
      window.localStorage.setItem(LAST_SECTION_KEY + area.key, section.to);
    } catch {
      // preferência opcional
    }
  }, [area.key, section]);

  if (location.pathname === area.to) return <Navigate to={lastSectionFor(area)} replace />;

  const isDetail = section && location.pathname !== section.to;
  return (
    <>
      {!isDetail && (
        <NavTabs
          label={`Seções de ${area.label}`}
          className="-mx-4 mb-5 px-4 sm:-mx-6 sm:px-6 lg:hidden"
          tabs={area.sections.map((item) => ({ to: item.to, label: item.label, icon: <item.icon /> }))}
        />
      )}
      <Outlet />
    </>
  );
}
