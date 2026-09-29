import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RequireAuth, useAuth } from "@qqorvex/auth";
import { cx } from "@qqorvex/ui";
import { DailyCheckinPrompt } from "./DailyCheckinPrompt";
import { VexSessionProvider, useVexSession } from "../vex/VexSessionContext";
import { CurrentItemProvider } from "../vex/CurrentItemContext";
import { VexPanel } from "../vex/VexPanel";
import { AccountProvider } from "./account";
import { PageMetaProvider } from "./shell/PageMeta";
import { Sidebar } from "./shell/Sidebar";
import { TopBar } from "./shell/TopBar";
import { CommandPalette } from "./shell/CommandPalette";
import { MobileBottomNav } from "./shell/MobileNav";
import { PageTransition } from "./shell/PageTransition";
import { QuickCreateProvider } from "./shell/QuickCreate";
import { supabase } from "./supabase";
import { Onboarding } from "./Onboarding";
import { APP_SKIN_STORAGE_KEY, isAppSkin, useTheme, type AppTheme } from "./ThemeContext";

type AuthUser = NonNullable<ReturnType<typeof useAuth>["session"]>["user"];

function needsOnboarding(user: AuthUser): boolean {
  const metadata = user.user_metadata ?? {};
  if (metadata.qqorvex_onboarding_completed === true) return false;
  if (metadata.qqorvex_onboarding_pending === true) return true;

  // Provedores OAuth não aceitam metadados arbitrários no cadastro: o horário de início do OAuth
  // (guardado nesta aba) distingue uma conta nova de uma conta existente voltando pelo mesmo fluxo.
  let startedAt: number | null = null;
  try {
    const stored = window.sessionStorage.getItem("qqorvex.oauth.started_at");
    if (stored) startedAt = Number(stored);
  } catch {
    // Sem armazenamento, cai no critério de idade da conta.
  }
  const createdAt = Date.parse(user.created_at);
  const oauthStartedRecently = Boolean(startedAt && Number.isFinite(startedAt) && Number.isFinite(createdAt) && createdAt >= startedAt - 5 * 60 * 1000);
  const accountAge = Date.now() - createdAt;
  const accountWasJustCreated = Number.isFinite(createdAt) && accountAge >= -5 * 60 * 1000 && accountAge <= 24 * 60 * 60 * 1000;
  if (startedAt && !oauthStartedRecently) {
    try {
      window.sessionStorage.removeItem("qqorvex.oauth.started_at");
    } catch {
      /* opcional */
    }
  }
  return oauthStartedRecently || accountWasJustCreated;
}

const COLLAPSED_KEY = "qqorvex.nav.collapsed";
const VEX_OPEN_KEY = "qqorvex.vex.open";

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* preferência visual opcional */
  }
}

/** Rota-layout das páginas autenticadas. */
export function ProtectedLayout() {
  return (
    <RequireAuth>
      <AccountProvider>
        <VexSessionProvider>
          <CurrentItemProvider>
            <PageMetaProvider>
              <QuickCreateProvider>
                <Shell />
              </QuickCreateProvider>
            </PageMetaProvider>
          </CurrentItemProvider>
        </VexSessionProvider>
      </AccountProvider>
    </RequireAuth>
  );
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { setTheme, setSkin } = useTheme();
  const { setPendingPrompt } = useVexSession();
  const isVexPage = location.pathname === "/vex";
  const [collapsed, setCollapsed] = useState(() => readFlag(COLLAPSED_KEY));
  const [vexOpen, setVexOpen] = useState(() => readFlag(VEX_OPEN_KEY));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const user = session!.user;
  const remotePreferences = user.user_metadata.qqorvex_preferences as { theme?: AppTheme; skin?: unknown } | undefined;

  useEffect(() => {
    let hasLocalTheme = false;
    let hasLocalSkin = false;
    try {
      hasLocalTheme = window.localStorage.getItem("qqorvex.theme") !== null;
      hasLocalSkin = window.localStorage.getItem(APP_SKIN_STORAGE_KEY) !== null;
    } catch {
      /* opcional */
    }
    if (!hasLocalTheme && (remotePreferences?.theme === "dark" || remotePreferences?.theme === "light")) setTheme(remotePreferences.theme);
    if (!hasLocalSkin && isAppSkin(remotePreferences?.skin)) setSkin(remotePreferences.skin);
    // Sincroniza só uma vez por usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => writeFlag(COLLAPSED_KEY, collapsed), [collapsed]);
  useEffect(() => writeFlag(VEX_OPEN_KEY, vexOpen), [vexOpen]);

  const openVex = useCallback(
    (prompt?: string) => {
      if (prompt) setPendingPrompt(prompt);
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop || location.pathname === "/vex") {
        navigate("/vex");
        return;
      }
      setVexOpen(true);
    },
    [location.pathname, navigate, setPendingPrompt],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (key === "j") {
        event.preventDefault();
        if (location.pathname === "/vex") return;
        setVexOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname]);

  if (!onboardingFinished && needsOnboarding(user)) {
    return (
      <Onboarding
        onComplete={(path) => {
          setOnboardingFinished(true);
          try {
            window.sessionStorage.removeItem("qqorvex.oauth.started_at");
          } catch {
            /* opcional */
          }
          navigate(path, { replace: true });
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} onOpenPalette={() => setPaletteOpen(true)} onOpenVex={() => openVex()} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} onToggleVex={() => setVexOpen((value) => !value)} vexOpen={vexOpen && !isVexPage} />
        <main
          id="conteudo"
          className={cx(
            "flex min-w-0 flex-1 flex-col",
            isVexPage
              ? "pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0"
              : "px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-7 xl:px-10",
          )}
        >
          <PageTransition />
        </main>
      </div>

      {!isVexPage && <VexPanel isOpen={vexOpen} onClose={() => setVexOpen(false)} />}
      <MobileBottomNav />
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenVex={openVex} />
      <DailyCheckinPrompt client={supabase} userId={user.id} />
    </div>
  );
}
