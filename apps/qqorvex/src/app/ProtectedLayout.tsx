import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignOutIcon } from "@phosphor-icons/react";
import { RequireAuth, useAuth, useProfile } from "@qqorvex/auth";
import { Sidebar } from "@qqorvex/ui";
import { TitleBadge } from "@qqorvex/module-gamificacao";
import { DailyCheckinPrompt } from "./DailyCheckinPrompt";
import { VexSessionProvider } from "../vex/VexSessionContext";
import { CurrentItemProvider } from "../vex/CurrentItemContext";
import { VexPanel } from "../vex/VexPanel";
import { PageMetaProvider } from "./shell/PageMeta";
import { AppHeader } from "./shell/AppHeader";
import { CommandPalette } from "./shell/CommandPalette";
import { MobileBottomNav, MoreSheet } from "./shell/MobileNav";
import { PageTransition } from "./shell/PageTransition";
import { BRAND_ASSETS, getNavSections } from "./shell/navigation";
import { supabase } from "./supabase";
import { Onboarding } from "./Onboarding";
import { APP_SKIN_STORAGE_KEY, isAppSkin, useTheme, type AppTheme } from "./ThemeContext";

type AuthUser = NonNullable<ReturnType<typeof useAuth>["session"]>["user"];

function needsOnboarding(user: AuthUser): boolean {
  const metadata = user.user_metadata ?? {};
  if (metadata.qqorvex_onboarding_completed === true) return false;
  if (metadata.qqorvex_onboarding_pending === true) return true;

  // OAuth providers don't accept arbitrary signup metadata. The one-tab timestamp distinguishes
  // a first-time OAuth account from an existing account returning through the same login flow.
  let startedAt: number | null = null;
  try {
    const stored = window.sessionStorage.getItem("qqorvex.oauth.started_at");
    if (stored) startedAt = Number(stored);
  } catch {
    // Continue with a short account-age fallback if browser storage is unavailable.
  }
  const createdAt = Date.parse(user.created_at);
  const oauthStartedRecently = Boolean(startedAt && Number.isFinite(startedAt) && Number.isFinite(createdAt) && createdAt >= startedAt - 5 * 60 * 1000);
  const accountAge = Date.now() - createdAt;
  const accountWasJustCreated = Number.isFinite(createdAt) && accountAge >= -5 * 60 * 1000 && accountAge <= 24 * 60 * 60 * 1000;
  if (startedAt && !oauthStartedRecently) {
    try { window.sessionStorage.removeItem("qqorvex.oauth.started_at"); } catch { /* opcional */ }
  }
  return oauthStartedRecently || accountWasJustCreated;
}

function readNavPinnedPreference(): boolean {
  try {
    return window.localStorage.getItem("qqorvex.nav.pinned") === "true";
  } catch {
    return false;
  }
}

/**
 * Rota-layout pras páginas autenticadas — shell do Design System v1.0: sidebar persistente,
 * cabeçalho fixo (saudação, data, busca/paleta, captura rápida e notificações), conteúdo e o
 * painel lateral da Vex. Em `/vex` o chat já ocupa a área de conteúdo, então o painel não abre lá
 * (o botão do cabeçalho volta pra Hoje com o painel aberto, mantendo a mesma conversa).
 */
export function ProtectedLayout() {
  return (
    <RequireAuth>
      <VexSessionProvider>
        <CurrentItemProvider>
          <PageMetaProvider>
            <Shell />
          </PageMetaProvider>
        </CurrentItemProvider>
      </VexSessionProvider>
    </RequireAuth>
  );
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVexPage = location.pathname === "/vex";
  const [vexOpen, setVexOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [navPinned, setNavPinned] = useState(readNavPinnedPreference);
  const { session } = useAuth();
  const { profile } = useProfile(supabase, session!.user.id);
  const { setTheme, setSkin } = useTheme();
  const syncedPreferenceUser = useRef<string | null>(null);
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const isOwner = profile?.role === "dono";
  const remotePreferences = session!.user.user_metadata.qqorvex_preferences as { theme?: AppTheme; skin?: unknown } | undefined;
  const remoteTheme = remotePreferences?.theme;
  const remoteSkin = remotePreferences?.skin;

  useEffect(() => {
    if (syncedPreferenceUser.current === session!.user.id) return;
    syncedPreferenceUser.current = session!.user.id;
    let hasLocalTheme = false;
    let hasLocalSkin = false;
    try {
      hasLocalTheme = window.localStorage.getItem("qqorvex.theme") !== null;
      hasLocalSkin = window.localStorage.getItem(APP_SKIN_STORAGE_KEY) !== null;
    } catch { /* opcional */ }
    if (!hasLocalTheme && (remoteTheme === "dark" || remoteTheme === "light")) setTheme(remoteTheme);
    if (!hasLocalSkin && isAppSkin(remoteSkin)) setSkin(remoteSkin);
  }, [remoteSkin, remoteTheme, session, setSkin, setTheme]);

  useEffect(() => {
    try {
      window.localStorage.setItem("qqorvex.nav.pinned", String(navPinned));
    } catch {
      // Preferência visual opcional: armazenamento indisponível não deve afetar a navegação.
    }
  }, [navPinned]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openVex = useCallback(() => {
    if (location.pathname === "/vex") navigate("/");
    setVexOpen(true);
  }, [location.pathname, navigate]);

  const navSections = getNavSections(isOwner);
  if (!onboardingFinished && needsOnboarding(session!.user)) {
    return (
      <Onboarding
        onComplete={(path) => {
          setOnboardingFinished(true);
          try { window.sessionStorage.removeItem("qqorvex.oauth.started_at"); } catch { /* opcional */ }
          navigate(path, { replace: true });
        }}
      />
    );
  }
  return (
    <div className="relative isolate flex min-h-screen items-stretch bg-background">
      <div
        className={`relative flex min-w-0 flex-1 items-stretch transition-[padding-right] duration-[220ms] ease-out motion-reduce:transition-none ${
          isVexPage ? "" : vexOpen ? "desktop:pr-[360px]" : "desktop:pr-[50px]"
        }`}
      >
        <div className={`hidden shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none desktop:block ${navPinned ? "w-[248px]" : "w-[72px]"}`}>
          <Sidebar
            sections={navSections}
            brandSymbolSrc={BRAND_ASSETS.symbol}
            pinned={navPinned}
            onTogglePinned={() => setNavPinned((pinned) => !pinned)}
            footer={(collapsed) => <SidebarUser profile={profile} collapsed={collapsed} />}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenPalette={() => setPaletteOpen(true)} displayName={profile?.display_name || profile?.username || ""} />
          <main className={`flex min-w-0 flex-1 flex-col ${isVexPage ? "p-0 pb-[calc(68px+env(safe-area-inset-bottom))] desktop:pb-0" : "px-[18px] pb-[calc(110px+env(safe-area-inset-bottom))] pt-[26px] sm:px-6 desktop:px-[54px] desktop:pb-[84px] desktop:pt-[42px]"}`}>
            <div className="flex w-full min-w-0 flex-1 flex-col">
              <PageTransition />
            </div>
          </main>
        </div>
      </div>

      <div className="relative z-30">
        <MobileBottomNav onOpenVex={() => navigate("/vex")} onOpenMore={() => setMoreOpen(true)} vexActive={isVexPage} moreOpen={moreOpen} />
        <MoreSheet sections={navSections} isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>

      {!isVexPage && <VexPanel isOpen={vexOpen} onOpen={() => setVexOpen(true)} onClose={() => setVexOpen(false)} />}

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenVex={openVex} isOwner={isOwner} />
      <DailyCheckinPrompt client={supabase} userId={session!.user.id} />
    </div>
  );
}

function SidebarUser({ profile, collapsed }: { profile: ReturnType<typeof useProfile>["profile"]; collapsed: boolean }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const email = session?.user.email ?? "";
  const name = profile?.display_name || profile?.username || email.split("@")[0] || "Você";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`flex min-w-0 items-center ${collapsed ? "flex-col gap-1" : "gap-2.5"}`}>
      <button
        type="button"
        onClick={(event) => {
          if (event.detail > 0) event.currentTarget.blur();
          navigate("/perfil");
        }}
        aria-label={`Abrir perfil de ${name}`}
        className={`flex min-w-0 cursor-pointer items-center rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${collapsed ? "justify-center" : "flex-1 gap-2.5"}`}
        title="Perfil"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className={`shrink-0 rounded-full border border-border object-cover ${collapsed ? "h-8 w-8" : "h-9 w-9"}`} />
        ) : (
          <span className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[11px] text-text-secondary ${collapsed ? "h-8 w-8" : "h-9 w-9"}`}>
            {initials || "·"}
          </span>
        )}
        {!collapsed && <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold">{name}</span>
          <span className="block truncate text-[10px] text-text-muted">{profile?.username ? `@${profile.username}` : email}</span>
          <TitleBadge title={profile?.selected_title || "Iniciante"} size="sm" className="mt-1 max-w-full" />
        </span>}
      </button>
      <button
        type="button"
        onClick={(event) => {
          if (event.detail > 0) event.currentTarget.blur();
          signOut();
        }}
        title="Sair"
        aria-label="Sair da conta"
        className={`flex h-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-muted transition-colors hover:border-border hover:bg-chip-neutral hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${collapsed ? "w-9" : "px-2 text-[11px]"}`}
      >
        {collapsed ? (
          <SignOutIcon size={17} aria-hidden="true" />
        ) : "Sair"}
      </button>
    </div>
  );
}
