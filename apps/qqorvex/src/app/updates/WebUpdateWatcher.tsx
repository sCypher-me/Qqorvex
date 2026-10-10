import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { useToast } from "@qqorvex/ui";
import { fetchNewerBuild, reloadForNewVersion } from "./webUpdate";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATED_FLAG_KEY = "qqorvex.web-update.applied-version";

/**
 * Mantém o app web na versão publicada sem interromper o uso: confere `/version.json` a cada
 * 5 minutos e quando a aba volta ao foco. Ao achar um build novo, não recarrega na hora (o usuário
 * pode estar digitando); a troca acontece na próxima mudança de tela, quando a página já ia mudar.
 * No APK/desktop a interface vem embutida e é atualizada pelo `AppUpdateBanner`.
 */
export function WebUpdateWatcher() {
  const location = useLocation();
  const pendingVersion = useRef<string | null>(null);
  const lastPath = useRef(location.pathname);
  const { toast } = useToast();
  const enabled = !import.meta.env.DEV && !isTauri();

  useEffect(() => {
    if (!enabled) return;
    let applied: string | null = null;
    try {
      applied = window.sessionStorage.getItem(UPDATED_FLAG_KEY);
      window.sessionStorage.removeItem(UPDATED_FLAG_KEY);
    } catch {
      /* armazenamento indisponível: só não mostra o aviso */
    }
    if (applied) toast({ title: "Qqorvex atualizado", description: `Você já está na versão ${applied}.`, tone: "success" });
  }, [enabled, toast]);

  useEffect(() => {
    if (!enabled) return;
    let controller: AbortController | null = null;

    const check = async () => {
      if (pendingVersion.current || !navigator.onLine) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const newer = await fetchNewerBuild(__QQORVEX_BUILD_ID__, controller.signal);
        if (newer) pendingVersion.current = newer.version;
      } catch {
        /* sem rede ou deploy em andamento: tenta de novo no próximo ciclo */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled]);

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;
    const version = pendingVersion.current;
    if (!enabled || !version) return;
    try {
      window.sessionStorage.setItem(UPDATED_FLAG_KEY, version);
    } catch {
      /* segue sem o aviso pós-atualização */
    }
    if (!reloadForNewVersion()) pendingVersion.current = null;
  }, [enabled, location.pathname]);

  return null;
}
