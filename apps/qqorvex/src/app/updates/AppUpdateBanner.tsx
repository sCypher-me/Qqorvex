import { useCallback, useEffect, useState } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { ArrowCircleUp, ArrowClockwise, CheckCircle, DownloadSimple, X, WarningCircle } from "@phosphor-icons/react";
import { findAvailableUpdate, type AppUpdate, type GithubRelease } from "./releaseFeed";

const REPOSITORY_RELEASES_API = "https://api.github.com/repos/sCypher-me/Qqorvex/releases?per_page=20";
const CHECK_CACHE_KEY = "qqorvex.android-update.check.v1";
const DISMISSED_VERSION_KEY = "qqorvex.android-update.dismissed.v1";
const DOWNLOADED_VERSION_KEY = "qqorvex.android-update.downloaded.v1";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type CheckCache = { checkedAt: number; update: AppUpdate | null };
type UpdatePhase = "idle" | "downloading" | "permission" | "error";

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* cache local opcional */ }
}

export function AppUpdateBanner() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [message, setMessage] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const checkForUpdate = useCallback(async (force = false) => {
    if (!isTauri() || !/Android/i.test(navigator.userAgent)) return;
    const cached = readJson<CheckCache>(CHECK_CACHE_KEY);
    if (!force && cached && Date.now() - cached.checkedAt < CHECK_INTERVAL_MS) {
      setUpdate(cached.update);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const device = await invoke<{ architecture: string }>("plugin:qqorvex-updater|get_device_abi");
      const response = await fetch(REPOSITORY_RELEASES_API, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GitHub respondeu HTTP ${response.status}.`);
      const releases = await response.json() as GithubRelease[];
      const found = findAvailableUpdate(releases, __QQORVEX_APP_VERSION__, device.architecture, __QQORVEX_UPDATE_CHANNEL__);
      setUpdate(found);
      setDownloaded(readJson<string>(DOWNLOADED_VERSION_KEY) === found?.version);
      writeJson(CHECK_CACHE_KEY, { checkedAt: Date.now(), update: found } satisfies CheckCache);
    } catch (error) {
      console.warn("Não foi possível conferir atualizações do Qqorvex.", error);
      if (cached?.update) setUpdate(cached.update);
      // Reduz tentativas repetidas quando a rede está offline ou o limite público da API é atingido.
      writeJson(CHECK_CACHE_KEY, { checkedAt: Date.now() - CHECK_INTERVAL_MS + 60_000, update: cached?.update ?? null } satisfies CheckCache);
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdate]);

  const beginUpdate = async () => {
    if (!update) return;
    setMessage("");
    if (!downloaded) {
      setPhase("downloading");
      try {
        await invoke("plugin:qqorvex-updater|download_update", {
          request: { url: update.url, sha256: update.sha256 },
        });
        setDownloaded(true);
        writeJson(DOWNLOADED_VERSION_KEY, update.version);
      } catch (error) {
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "Não foi possível baixar a atualização. Tente novamente.");
        return;
      }
    }

    try {
      const result = await invoke<{ status: string }>("plugin:qqorvex-updater|install_update");
      if (result.status === "permission_required") {
        setPhase("permission");
        setMessage("Permita que o Qqorvex instale atualizações nas configurações do Android. Depois volte e toque em Instalar.");
      } else {
        setPhase("idle");
        setMessage("O instalador do Android foi aberto. Confirme a atualização para concluir.");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "O Android não conseguiu abrir o instalador.";
      if (detail.includes("Baixe e valide a atualização antes de instalar")) {
        setDownloaded(false);
        try { window.localStorage.removeItem(DOWNLOADED_VERSION_KEY); } catch { /* cache local opcional */ }
      }
      setPhase("error");
      setMessage(detail);
    }
  };

  if (!update || readJson<string>(DISMISSED_VERSION_KEY) === update.version) return null;

  return (
    <section className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 sm:mx-6 lg:mx-8" role="status" aria-live="polite">
      <ArrowCircleUp size={24} weight="duotone" className="shrink-0 text-gold" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Qqorvex {update.version} está disponível</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{message || update.notes || "Baixe e instale a atualização pelo próprio app."}</p>
        {phase === "downloading" && <p className="mt-1 flex items-center gap-2 text-sm text-gold"><ArrowClockwise className="animate-spin" /> Baixando e verificando o APK…</p>}
        {phase === "permission" && <p className="mt-1 flex items-center gap-2 text-sm text-gold"><WarningCircle /> O Android exige autorização da fonte antes de instalar.</p>}
        {phase === "error" && <p className="mt-1 flex items-center gap-2 text-sm text-danger"><WarningCircle /> O download continua disponível para uma nova tentativa.</p>}
      </div>
      <button type="button" onClick={() => void beginUpdate()} disabled={phase === "downloading"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold px-4 py-2 font-semibold text-canvas transition hover:brightness-105 disabled:opacity-60">
        {downloaded ? <CheckCircle size={18} /> : <DownloadSimple size={18} />}
        {phase === "downloading" ? "Baixando…" : downloaded ? "Instalar" : "Atualizar agora"}
      </button>
      <button type="button" onClick={() => { writeJson(DISMISSED_VERSION_KEY, update.version); setUpdate(null); }} className="rounded-lg p-2 text-ink-muted hover:bg-canvas/60 hover:text-ink" aria-label="Dispensar atualização">
        <X size={18} />
      </button>
      <p className="basis-full pl-9 text-xs text-ink-muted">O APK será baixado no app. Na primeira vez, o Android pode pedir autorização e confirmação da instalação.</p>
    </section>
  );
}
