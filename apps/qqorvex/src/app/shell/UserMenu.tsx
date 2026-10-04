import { useNavigate } from "react-router-dom";
import { CaretUpDownIcon, MoonIcon, SignOutIcon, SunIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import { Avatar, Badge, DropdownMenu, cx, type MenuEntry } from "@qqorvex/ui";
import { useAccount } from "../account";
import { useTheme } from "../ThemeContext";
import { ACCOUNT_LINKS } from "./navigation";

/** Menu da conta: perfil, conquistas, plano, configurações, tema e sair. */
export function UserMenu({ collapsed = false, compact = false }: { collapsed?: boolean; compact?: boolean }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, displayName, email, isOwner, isPlus, access } = useAccount();
  const planBadge = access?.source === "lifetime" ? "Lifetime" : access?.source === "parceiro" ? "Parceiro" : isPlus ? "Plus" : null;
  const { theme, toggleTheme } = useTheme();

  const items: MenuEntry[] = [
    { heading: email || displayName },
    ...ACCOUNT_LINKS.filter((link) => !link.ownerOnly || isOwner).map((link) => ({
      label: link.label,
      icon: <link.icon />,
      onSelect: () => navigate(link.to),
    })),
    "separator",
    {
      label: theme === "dark" ? "Tema claro" : "Tema escuro",
      icon: theme === "dark" ? <SunIcon /> : <MoonIcon />,
      onSelect: toggleTheme,
    },
    "separator",
    { label: "Sair", icon: <SignOutIcon />, onSelect: () => void signOut() },
  ];

  return (
    <DropdownMenu
      label="Menu da conta"
      placement={compact ? "bottom-end" : "top-start"}
      items={items}
      trigger={(props) =>
        compact ? (
          <button type="button" {...props} aria-label="Abrir menu da conta" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)]">
            <Avatar src={profile?.avatar_url} name={displayName} size={30} />
          </button>
        ) : (
          <button
            type="button"
            {...props}
            aria-label="Abrir menu da conta"
            className={cx(
              "flex min-w-0 items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--q-focus)]",
              collapsed ? "h-10 w-10 justify-center" : "w-full px-2 py-1.5",
            )}
          >
            <Avatar src={profile?.avatar_url} name={displayName} size={collapsed ? 28 : 30} />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-fg">{displayName}</span>
                    {planBadge && <Badge tone="gold">{planBadge}</Badge>}
                  </span>
                  <span className="block truncate text-2xs text-fg-4">{profile?.username ? `@${profile.username}` : email}</span>
                </span>
                <CaretUpDownIcon size={14} className="shrink-0 text-fg-4" />
              </>
            )}
          </button>
        )
      }
    />
  );
}
