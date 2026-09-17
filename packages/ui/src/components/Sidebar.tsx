import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export interface SidebarNavItem {
  label: string;
  to: string;
  /** Contagem opcional à direita (JetBrains Mono, texto apagado). */
  count?: string | number;
  /** Rotas-filhas (ex.: `/estudos/:id`) também marcam o item como ativo. */
  matchChildren?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Rótulo da marca no topo — sempre "Qqorvex" hoje, mas configurável em vez de fixo dentro do componente. */
  brandLabel?: string;
  /** Caminho da imagem do símbolo da marca. */
  brandSymbolSrc?: string;
  /** Rodapé (usuário, sair...). */
  footer?: ReactNode;
}

/**
 * Sidebar do Design System v1.0 — 256px, gradiente obsidiana, seções em caixa alta. Item ativo:
 * fundo cyan em degradê, barra luminosa de 3px à esquerda e contorno interno sutil.
 */
export function Sidebar({ sections, brandLabel = "Qqorvex", brandSymbolSrc, footer }: SidebarProps) {
  return (
    <nav className="w-64 shrink-0 h-screen sticky top-0 flex flex-col gap-5 px-3.5 py-[22px] border-r border-[rgba(50,57,68,.75)] bg-[linear-gradient(180deg,rgba(15,18,23,.96),rgba(9,11,14,.98))]">
      <div className="flex items-center gap-2.5 px-2.5 pt-0.5 pb-2">
        {brandSymbolSrc && (
          <img
            src={brandSymbolSrc}
            alt=""
            className="w-[22px] h-[22px] object-contain drop-shadow-[0_0_10px_rgba(184,138,84,.35)]"
          />
        )}
        <span className="font-display text-[19px] font-semibold tracking-[-0.015em]">{brandLabel}</span>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-[3px]">
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted px-2 py-1.5">
              {section.title}
            </span>
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={!item.matchChildren}>
                {({ isActive }) => (
                  <span
                    className={`flex items-center gap-[11px] w-full rounded-[11px] p-2.5 text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "text-vex-cyan-bright bg-[linear-gradient(90deg,rgba(67,185,210,.16),rgba(67,185,210,.04))] shadow-[inset_0_0_0_1px_rgba(67,185,210,.18)]"
                        : "text-text-secondary hover:bg-white/[.045] hover:text-text-primary"
                    }`}
                  >
                    <span
                      className={`w-[3px] h-[17px] rounded-sm shrink-0 ${
                        isActive ? "bg-vex-cyan-bright shadow-[0_0_10px_rgba(114,216,235,.6)]" : "bg-transparent"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.count !== undefined && item.count !== "" && (
                      <span className="font-mono text-[11px] text-text-muted">{item.count}</span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {footer && <div className="flex flex-col gap-2 border-t border-border pt-3.5">{footer}</div>}
    </nav>
  );
}
