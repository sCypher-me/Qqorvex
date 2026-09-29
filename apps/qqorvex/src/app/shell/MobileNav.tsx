import { NavLink, useLocation } from "react-router-dom";
import { cx } from "@qqorvex/ui";
import { lastSectionFor } from "./AreaLayout";
import { AREAS, HOME, VEX } from "./navigation";

/** Navegação inferior no celular: Hoje, as três áreas e a Vex. */
export function MobileBottomNav() {
  const location = useLocation();
  const items = [
    { key: HOME.key, label: HOME.label, to: HOME.to, icon: HOME.icon, active: location.pathname === "/" },
    ...AREAS.map((area) => ({
      key: area.key,
      label: area.label,
      to: location.pathname.startsWith(area.to) ? area.sections[0]!.to : lastSectionFor(area),
      icon: area.icon,
      active: location.pathname.startsWith(area.to),
    })),
    { key: VEX.key, label: VEX.label, to: VEX.to, icon: VEX.icon, active: location.pathname === VEX.to },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line-soft bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.key}
            to={item.to}
            aria-current={item.active ? "page" : undefined}
            className={cx(
              "relative flex h-[60px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
              item.active ? (item.key === "vex" ? "text-ai-fg" : "text-gold-fg") : "text-fg-4",
            )}
          >
            {item.active && <span aria-hidden="true" className={cx("absolute top-0 h-[2px] w-8 rounded-full", item.key === "vex" ? "bg-ai" : "bg-gold")} />}
            <Icon size={22} weight={item.active ? "fill" : "regular"} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
