import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RequireAuth, useAuth, useProfile } from "@qqorvex/auth";
import { Sidebar } from "@qqorvex/ui";
import { VexSessionProvider } from "../vex/VexSessionContext";
import { CurrentItemProvider } from "../vex/CurrentItemContext";
import { VexPanel } from "../vex/VexPanel";
import { PageMetaProvider } from "./shell/PageMeta";
import { AppHeader } from "./shell/AppHeader";
import { CommandPalette } from "./shell/CommandPalette";
import { BRAND_ASSETS, NAV_SECTIONS } from "./shell/navigation";
import { supabase } from "./supabase";

/**
 * Rota-layout pras páginas autenticadas — shell do Design System v1.0: sidebar persistente,
 * cabeçalho fixo (título da página, busca/paleta, notificações, "Falar com a Vex"), conteúdo e o
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

  function toggleVex() {
    if (isVexPage) {
      navigate("/");
      setVexOpen(true);
      return;
    }
    setVexOpen((v) => !v);
  }

  return (
    <div className="flex min-h-screen items-stretch">
      <Sidebar sections={NAV_SECTIONS} brandSymbolSrc={BRAND_ASSETS.symbol} footer={<SidebarUser />} />

      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader onOpenPalette={() => setPaletteOpen(true)} onToggleVex={toggleVex} />
        <main className="flex-1 min-w-0 px-8 pt-[30px] pb-12 flex flex-col gap-[22px]">
          <Outlet />
        </main>
      </div>

      {vexOpen && !isVexPage && <VexPanel onClose={() => setVexOpen(false)} />}

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenVex={openVex} />
    </div>
  );
}

function SidebarUser() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session!.user.id;
  const { profile } = useProfile(supabase, userId);
  const email = session?.user.email ?? "";
  const name = profile?.display_name || profile?.username || email.split("@")[0] || "Você";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <button
        type="button"
        onClick={() => navigate("/perfil")}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
        title="Perfil"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-[30px] h-[30px] rounded-full object-cover border border-border" />
        ) : (
          <span className="w-[30px] h-[30px] rounded-full border border-border bg-vex-raised flex items-center justify-center font-mono text-[11px] text-text-secondary shrink-0">
            {initials || "·"}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold truncate">{name}</span>
          <span className="block text-[11px] text-text-muted truncate">{email}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => signOut()}
        title="Sair"
        className="border border-border rounded-lg text-text-muted text-[11px] px-2 py-1 cursor-pointer hover:text-text-primary"
      >
        Sair
      </button>
    </div>
  );
}
