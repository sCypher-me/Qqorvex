import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { BrandSymbol, IconButton, VexAvatar, cx } from "@qqorvex/ui";
import { NotificationsButton } from "./Notifications";
import { getRouteContext } from "./navigation";
import { QuickCreateMenu } from "./QuickCreate";
import { UserMenu } from "./UserMenu";
import { useSecretBrandTap } from "../secret/SecretRedeem";

/**
 * Barra superior fina: trilha de navegação (desktop) ou marca + título (celular), e à direita
 * busca, criação, notificações e o botão da Vex.
 */
export function TopBar({ onOpenPalette, onToggleVex, vexOpen }: { onOpenPalette: () => void; onToggleVex: () => void; vexOpen: boolean }) {
  const location = useLocation();
  const context = getRouteContext(location.pathname);
  const isVexPage = location.pathname === "/vex";
  const onBrandTap = useSecretBrandTap();

  return (
    <header data-premium-topbar className="sticky top-0 z-20 flex h-[calc(3.5rem_+_env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-line-soft bg-canvas/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-6 lg:h-14 lg:pt-0 lg:px-8">
      <Link to="/" onClick={onBrandTap} className="flex items-center lg:hidden" aria-label="Ir para Hoje">
        <BrandSymbol size={22} />
      </Link>
      <span className="min-w-0 flex-1 truncate font-display text-[16px] font-semibold text-fg lg:hidden">{context.area?.label ?? context.title}</span>
      <nav aria-label="Você está em" className="hidden min-w-0 flex-1 items-center gap-1.5 text-[13.5px] lg:flex">
        {context.trail.map((crumb, index) => {
          const last = index === context.trail.length - 1;
          return (
            <Fragment key={crumb.to}>
              {index > 0 && <CaretRightIcon size={12} className="shrink-0 text-fg-4" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-fg">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="truncate text-fg-3 transition-colors hover:text-fg">
                  {crumb.label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Buscar" onClick={onOpenPalette} className="lg:hidden">
          <MagnifyingGlassIcon />
        </IconButton>
        <div className="lg:hidden">
          <QuickCreateMenu
            trigger={(props) => (
              <IconButton label="Criar novo" {...props}>
                <PlusIcon />
              </IconButton>
            )}
          />
        </div>
        <NotificationsButton />
        {!isVexPage && (
          <button
            type="button"
            onClick={onToggleVex}
            aria-pressed={vexOpen}
            aria-label={vexOpen ? "Fechar a Vex" : "Abrir a Vex"}
            title="Vex (⌘J)"
            className={cx(
              "ml-1 hidden h-8 items-center gap-2 rounded-lg border px-2 pr-2.5 text-[13px] font-medium transition-colors lg:flex",
              vexOpen ? "border-ai-line bg-ai-soft text-ai-fg" : "border-line text-fg-2 hover:border-ai-line hover:text-ai-fg",
            )}
          >
            <VexAvatar size={20} />
            Vex
          </button>
        )}
        <div className="ml-1 lg:hidden">
          <UserMenu compact />
        </div>
      </div>
    </header>
  );
}
