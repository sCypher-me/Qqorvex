import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { CaretDownIcon, LightningIcon, MagnifyingGlassIcon, PlusIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { BrandSymbol, Kbd, ProgressBar, Tooltip, VexAvatar, Wordmark, cx } from "@qqorvex/ui";
import { useGamificationStats } from "@qqorvex/module-gamificacao";
import { useAccount } from "../account";
import { supabase } from "../supabase";
import { AREAS, HOME, VEX, type NavArea } from "./navigation";
import { QuickCreateMenu } from "./QuickCreate";
import { UserMenu } from "./UserMenu";
import { useSecretBrandTap } from "../secret/SecretRedeem";

const EXPANDED_KEY = "qqorvex.nav.areas";

function readExpanded(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(EXPANDED_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function itemClasses(active: boolean, collapsed: boolean) {
  return cx(
    "group relative flex h-9 min-w-0 items-center gap-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--q-focus)] [&_svg]:size-[18px] [&_svg]:shrink-0",
    collapsed ? "w-10 justify-center" : "px-2.5",
    active ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
  );
}

/**
 * Navegação principal (desktop). Hoje e Vex no topo e na base; as três áreas expandem suas
 * seções. Recolhida, vira um trilho de ícones com dicas.
 */
export function Sidebar({ collapsed, onToggleCollapsed, onOpenPalette, onOpenVex }: { collapsed: boolean; onToggleCollapsed: () => void; onOpenPalette: () => void; onOpenVex: () => void }) {
  const location = useLocation();
  const onBrandTap = useSecretBrandTap();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(readExpanded);
  const activeArea = AREAS.find((area) => location.pathname.startsWith(area.to));

  useEffect(() => {
    try {
      window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded));
    } catch {
      // preferência visual opcional
    }
  }, [expanded]);

  const isAreaOpen = (area: NavArea) => expanded[area.key] ?? true;

  return (
    <aside
      aria-label="Navegação principal"
      className={cx(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r border-line-soft bg-sidebar transition-[width] duration-200 ease-q",
        collapsed ? "w-[var(--q-sidebar-rail)] items-center" : "w-[var(--q-sidebar-width)]",
      )}
    >
      <div className={cx("flex h-14 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-4 pr-2")}>
        {collapsed ? (
          <Tooltip content="Expandir menu" side="right">
            <button type="button" onClick={onToggleCollapsed} className="flex h-9 w-9 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-[var(--q-focus)]" aria-label="Expandir menu">
              <BrandSymbol size={24} />
            </button>
          </Tooltip>
        ) : (
          <Link to="/" onClick={onBrandTap} className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-[var(--q-focus)]" aria-label="Qqorvex — ir para Hoje">
            <BrandSymbol size={24} />
            <Wordmark size={19} />
          </Link>
        )}
        {!collapsed && (
          <button type="button" onClick={onToggleCollapsed} title="Recolher menu" aria-label="Recolher menu" className="flex h-8 w-8 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg-2">
            <SidebarSimpleIcon size={18} />
          </button>
        )}
      </div>

      <div className={cx("flex shrink-0 gap-1.5 pb-3", collapsed ? "flex-col items-center" : "px-3")}>
        {collapsed ? (
          <>
            <Tooltip content={`Buscar (${isMac ? "⌘" : "Ctrl"} K)`} side="right">
              <button type="button" onClick={onOpenPalette} aria-label="Buscar e comandos" className={itemClasses(false, true)}>
                <MagnifyingGlassIcon />
              </button>
            </Tooltip>
          </>
        ) : (
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Buscar e comandos"
            aria-keyshortcuts="Control+K Meta+K"
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas/60 px-2.5 text-[13px] text-fg-4 transition-colors hover:border-line-strong hover:text-fg-3"
          >
            <MagnifyingGlassIcon size={16} className="shrink-0" />
            <span className="flex-1 truncate text-left">Buscar…</span>
            <Kbd>{isMac ? "⌘K" : "Ctrl K"}</Kbd>
          </button>
        )}
        <QuickCreateMenu
          placement={collapsed ? "bottom-start" : "bottom-end"}
          trigger={(props) => (
            <button
              type="button"
              {...props}
              aria-label="Criar novo"
              title="Criar novo"
              className={cx(
                "flex h-9 shrink-0 items-center justify-center rounded-lg bg-gold text-on-gold shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] transition-colors hover:bg-gold-hover",
                collapsed ? "w-10" : "w-9",
              )}
            >
              <PlusIcon size={18} weight="bold" />
            </button>
          )}
        />
      </div>

      <nav className={cx("flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3", collapsed ? "items-center px-0" : "px-3")}>
        <SidebarLink to={HOME.to} label={HOME.label} icon={<HOME.icon />} collapsed={collapsed} end />

        {AREAS.map((area) => {
          const open = isAreaOpen(area);
          const areaActive = activeArea?.key === area.key;
          if (collapsed) {
            return (
              <div key={area.key} className="mt-2 flex flex-col items-center gap-0.5 border-t border-line-soft pt-2">
                {area.sections.map((section) => (
                  <SidebarLink key={section.key} to={section.to} label={section.label} icon={<section.icon />} collapsed />
                ))}
              </div>
            );
          }
          return (
            <div key={area.key} className="mt-3">
              <button
                type="button"
                onClick={() => setExpanded((current) => ({ ...current, [area.key]: !open }))}
                aria-expanded={open}
                className={cx(
                  "flex h-7 w-full items-center gap-1.5 rounded-md px-2.5 text-2xs font-semibold uppercase tracking-[0.08em] transition-colors",
                  areaActive ? "text-fg-2" : "text-fg-4 hover:text-fg-3",
                )}
              >
                <span className="flex-1 text-left">{area.label}</span>
                <CaretDownIcon size={11} weight="bold" className={cx("transition-transform duration-150", !open && "-rotate-90")} />
              </button>
              {open && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {area.sections.map((section) => (
                    <SidebarLink key={section.key} to={section.to} label={section.label} icon={<section.icon />} collapsed={false} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className={cx("mt-3 border-t border-line-soft pt-3", collapsed && "flex flex-col items-center")}>
          <VexLink collapsed={collapsed} onOpenVex={onOpenVex} />
        </div>
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

function SidebarLink({ to, label, icon, collapsed, end }: { to: string; label: string; icon: ReactNode; collapsed: boolean; end?: boolean }) {
  const link = (
    <NavLink to={to} end={end} aria-label={collapsed ? label : undefined} className={({ isActive }) => itemClasses(isActive, collapsed)}>
      {({ isActive }) => (
        <>
          {isActive && !collapsed && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gold" />}
          <span className={cx("flex", isActive ? "text-gold-fg" : "text-fg-4 group-hover:text-fg-3")}>{icon}</span>
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function VexLink({ collapsed, onOpenVex }: { collapsed: boolean; onOpenVex: () => void }) {
  const location = useLocation();
  const active = location.pathname === VEX.to;
  const button = (
    <button
      type="button"
      onClick={onOpenVex}
      aria-label={collapsed ? "Falar com a Vex" : undefined}
      className={cx(
        "group flex h-10 min-w-0 items-center gap-2.5 rounded-lg transition-colors duration-150",
        collapsed ? "w-10 justify-center" : "w-full px-2",
        active ? "bg-ai-soft text-fg" : "text-fg-2 hover:bg-ai-soft",
      )}
    >
      <VexAvatar size={24} />
      {!collapsed && (
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13.5px] font-medium leading-tight">Vex</span>
          <span className="block truncate text-2xs leading-tight text-fg-4">Sua assistente</span>
        </span>
      )}
    </button>
  );
  return collapsed ? (
    <Tooltip content="Vex" side="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { userId, isPlus } = useAccount();
  const { progress } = useGamificationStats(supabase, userId);

  return (
    <div className={cx("flex shrink-0 flex-col gap-2 border-t border-line-soft p-3", collapsed && "items-center px-0")}>
      {!collapsed && progress && (
        <Link to="/conquistas" className="group rounded-lg px-2 py-1.5 transition-colors hover:bg-hover" aria-label={`Nível ${progress.level}, ${progress.progressPercent}% para o próximo`}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-fg-2">Nível {progress.level}</span>
            <span className="tabular-nums text-fg-4">{progress.xp.toLocaleString("pt-BR")} XP</span>
          </div>
          <ProgressBar value={progress.progressPercent} height={4} />
        </Link>
      )}
      {!collapsed && !isPlus && (
        <Link
          to="/assinatura"
          className="flex items-center gap-2 rounded-lg border border-gold-line bg-gold-soft px-2.5 py-2 text-xs font-medium text-gold-fg transition-colors hover:bg-gold/20"
        >
          <LightningIcon size={15} weight="fill" />
          <span className="flex-1">Conhecer o Plus</span>
        </Link>
      )}
      <UserMenu collapsed={collapsed} />
    </div>
  );
}
