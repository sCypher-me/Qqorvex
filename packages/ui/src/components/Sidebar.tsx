import { NavLink } from "react-router-dom";

export interface SidebarNavItem {
  label: string;
  to: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Rótulo da marca no topo — sempre "Qqorvex" hoje, mas configurável em vez de fixo dentro do componente. */
  brandLabel?: string;
}

/**
 * Sidebar fixa sem ícones (docs/decisions/design-system-componentes-v1.md) — decidida via
 * brainstorming visual. Item ativo usa a mesma "assinatura" de barra + fundo tintado cyan do
 * Card/Input/chip. Seções agrupam os 9+ módulos (rótulo pequeno em caixa alta); `sections` é
 * livre — este componente não conhece a lista real de módulos do app.
 */
export function Sidebar({ sections, brandLabel = "Qqorvex" }: SidebarProps) {
  return (
    <nav className="w-[170px] shrink-0 bg-surface-1 border-r border-border h-screen sticky top-0 overflow-y-auto px-3.5 py-5 flex flex-col gap-5">
      <span className="font-display font-bold text-[15px] text-brand-gold tracking-wide px-1.5">{brandLabel}</span>
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <span className="font-sans text-[9px] uppercase tracking-wider text-warm-muted px-2.5 mb-1.5">{section.title}</span>
          {section.items.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              {({ isActive }) => (
                <span className="flex items-center gap-2">
                  <span className={`w-[2px] h-4 rounded-full shrink-0 ${isActive ? "bg-brand-cyan" : "bg-transparent"}`} />
                  <span
                    className={`flex-1 font-sans text-xs rounded-md px-2.5 py-1.5 transition-colors ${
                      isActive ? "text-brand-cyan bg-chip-cyan font-semibold" : "text-text-secondary-warm hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
