import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BookOpenIcon, BooksIcon, BrainIcon, CalendarBlankIcon, CheckSquareIcon,
  CrownIcon, FileTextIcon, HouseIcon,
  ShieldCheckIcon, SidebarSimpleIcon, SparkleIcon, TargetIcon,
  UserCircleIcon, WalletIcon,
} from "@phosphor-icons/react";

export interface SidebarNavItem {
  label: string;
  to: string;
  count?: string | number;
  matchChildren?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  brandLabel?: string;
  brandSymbolSrc?: string;
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
  pinned?: boolean;
  onTogglePinned?: () => void;
}

export type NavIconKind = "today" | "spark" | "tasks" | "calendar" | "habits" | "study" | "brain" | "library" | "documents" | "wallet" | "life" | "profile" | "security" | "manager";

export function iconForRoute(to: string): NavIconKind {
  const routes: Record<string, NavIconKind> = {
    "": "today", gamificacao: "spark", manager: "manager", tarefas: "tasks",
    agenda: "calendar", "metas-habitos": "habits", estudos: "study",
    "segundo-cerebro": "brain", biblioteca: "library", documentos: "documents",
    financas: "wallet", "vida-pessoal": "life", perfil: "profile", seguranca: "security",
  };
  return routes[to.replace(/^\//, "")] ?? "today";
}

const icons = {
  today: HouseIcon,
  spark: SparkleIcon,
  tasks: CheckSquareIcon,
  calendar: CalendarBlankIcon,
  habits: TargetIcon,
  study: BookOpenIcon,
  brain: BrainIcon,
  library: BooksIcon,
  documents: FileTextIcon,
  wallet: WalletIcon,
  life: UserCircleIcon,
  profile: UserCircleIcon,
  security: ShieldCheckIcon,
  manager: CrownIcon,
} satisfies Record<NavIconKind, typeof HouseIcon>;

export function NavIcon({ kind, className }: { kind: NavIconKind; className?: string }) {
  const Icon = icons[kind];
  return <Icon size={20} weight="regular" aria-hidden="true" className={className} />;
}

function blurAfterPointerClick(event: MouseEvent<HTMLElement>) {
  if (event.detail > 0) event.currentTarget.blur();
}

export function Sidebar({
  sections,
  brandLabel = "Qqorvex",
  brandSymbolSrc,
  footer,
  pinned = false,
  onTogglePinned,
}: SidebarProps) {
  const [pointerInside, setPointerInside] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const collapsed = !pinned && !pointerInside && !focusWithin;

  return (
    <nav
      id="desktop-primary-navigation"
      aria-label="Navegação principal"
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
      }}
      className={`fixed left-0 top-0 z-50 hidden h-dvh border-r border-border bg-[var(--qv-surface-canvas)] transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none desktop:flex desktop:flex-col ${collapsed ? "w-[72px] shadow-none" : "w-[248px] shadow-[12px_0_32px_rgb(0_0_0/0.2)]"}`}
    >
      <div id="desktop-navigation-content" className={`flex min-h-0 flex-1 flex-col ${collapsed ? "px-1.5" : "px-3.5"}`}>
        <div className={`flex shrink-0 items-center py-3 [@media(max-height:720px)]:py-2 ${collapsed ? "justify-center px-0" : "justify-between gap-2 px-2.5"}`}>
          <Link to="/" aria-label="Qqorvex — ir para Hoje" className="flex min-w-0 flex-col rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
            {collapsed ? (brandSymbolSrc ? <img src={brandSymbolSrc} alt="" className="h-7 w-7 object-contain" /> : <span className="text-[21px] font-bold tracking-[-0.07em] text-text-primary">Q</span>) : <>
              <span className="text-[25px] font-bold leading-none tracking-[-0.06em] text-text-primary [@media(max-height:720px)]:text-[21px]">{brandLabel}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.17em] text-text-muted [@media(max-height:720px)]:hidden">Vida em progresso</span>
            </>}
          </Link>
          {onTogglePinned && !collapsed && <button type="button" onClick={onTogglePinned} aria-label={pinned ? "Desafixar menu lateral" : "Fixar menu lateral aberto"} aria-pressed={pinned} title={pinned ? "Desafixar menu lateral" : "Fixar menu lateral aberto"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-chip-neutral hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
            <SidebarSimpleIcon size={18} weight={pinned ? "fill" : "regular"} aria-hidden="true" />
          </button>}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-1">
          {sections.map((section, sectionIndex) => (
            <div key={section.title} className={`flex flex-col gap-0.5 ${sectionIndex > 0 ? "mt-1.5 border-t border-border pt-1.5 [@media(max-height:720px)]:mt-1 [@media(max-height:720px)]:pt-1" : ""}`}>
              {!collapsed && <h2 className="mb-0 px-3 text-[10px] font-semibold leading-3 uppercase tracking-[0.14em] text-text-muted [@media(max-height:720px)]:text-[9px]">{section.title}</h2>}
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={!item.matchChildren} onClick={blurAfterPointerClick} aria-label={item.label} title={collapsed ? item.label : undefined} className="group block rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
                  {({ isActive }) => (
                    <span className={`relative flex min-h-[38px] items-center rounded-[9px] text-[13px] font-medium transition-colors [@media(max-height:760px)]:min-h-[32px] [@media(max-height:640px)]:min-h-[28px] [@media(max-height:560px)]:min-h-[26px] ${collapsed ? "justify-center" : "gap-3 px-3"} ${isActive ? "bg-chip-cyan font-semibold text-brand-primary before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:rounded-full before:bg-brand-primary" : "text-text-secondary hover:bg-chip-neutral hover:text-text-primary"}`}>
                      <NavIcon kind={iconForRoute(item.to)} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.count !== undefined && item.count !== "" && <span className="rounded-full bg-chip-neutral px-2 py-0.5 text-[10px] text-text-muted">{item.count}</span>}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={`shrink-0 border-t border-border py-2 [@media(max-height:720px)]:py-1 ${collapsed ? "px-1.5" : "px-3.5"}`}>
        {typeof footer === "function" ? footer(collapsed) : footer}
      </div>
    </nav>
  );
}
