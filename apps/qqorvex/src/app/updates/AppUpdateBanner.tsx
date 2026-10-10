import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { ArrowCircleUp, ArrowClockwise, CheckCircle, DownloadSimple, X, WarningCircle } from "@phosphor-icons/react";
import { useToast } from "@qqorvex/ui";
import { findAvailableUpdate, type AppUpdate, type GithubRelease } from "./releaseFeed";
import { shouldAutoDownload, shouldAutoInstall, updateWasApplied, type AutoInstallAttempt } from "./androidUpdatePolicy";

const REPOSITORY_RELEASES_API = "https://api.github.com/repos/sCypher-me/Qqorvex/releases?per_page=20";
const CHECK_CACHE_KEY = "qqorvex.android-update.check.v1";
const DISMISSED_VERSION_KEY = "qqorvex.android-update.dismissed.v1";
const DOWNLOADED_VERSION_KEY = "qqorvex.android-update.downloaded.v1";
const AUTO_INSTALL_KEY = "qqorvex.android-update.auto-install.v1";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type CheckCache = { checkedAt: number; update: AppUpdate | null };
type DeviceInfo = { architecture: string; metered: boolean; canInstall: boolean };
type UpdatePhase = "idle" | "downloading" | "ready" | "installing" | "permission" | "confirm" | "error";

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

function removeKeys(...keys: string[]) {
  try { keys.forEach((key) => window.localStorage.removeItem(key)); } catch { /* cache local opcional */ }
}

function isAndroidApp() {
  return isTauri() && /Android/i.test(navigator.userAgent);
}

async function readDevice(): Promise<DeviceInfo> {
  const device = await invoke<Partial<DeviceInfo>>("plugin:qqorvex-updater|get_device_abi");
  return {
    architecture: device.architecture ?? "unknown",
    // APKs antigos do plugin não informam a rede: trata como medida e não baixa sozinho.
    metered: device.metered ?? true,
    canInstall: device.canInstall ?? false,
  };
}

/**
 * Atualização do APK sem interromper o uso. O app confere o GitHub Releases, baixa o APK novo em
 * segundo plano quando está no Wi-Fi (conferindo o SHA-256) e instala quando a pessoa sai do app —
 * ao voltar, já abre na versão nova. Se o Android exigir confirmação, o aviso oferece "Instalar".
 */
export function AppUpdateBanner() {
  const { toast } = useToast();
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [message, setMessage] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => readJson<string>(DISMISSED_VERSION_KEY));

  const state = useRef({ update, phase, downloaded, device: null as DeviceInfo | null });
  state.current.update = update;
  state.current.phase = phase;
  state.current.downloaded = downloaded;

  // Primeira abertura depois de uma instalação automática: avisa e limpa o estado da versão antiga.
  useEffect(() => {
    if (!isAndroidApp()) return;
    const attempt = readJson<AutoInstallAttempt>(AUTO_INSTALL_KEY);
    if (attempt && updateWasApplied(attempt.version, __QQORVEX_APP_VERSION__)) {
      removeKeys(AUTO_INSTALL_KEY, DOWNLOADED_VERSION_KEY, DISMISSED_VERSION_KEY, CHECK_CACHE_KEY);
      toast({ title: "Qqorvex atualizado", description: `Você já está na versão ${__QQORVEX_APP_VERSION__}.`, tone: "success" });
    }
  }, [toast]);

  const download = useCallback(async (target: AppUpdate, automatic: boolean) => {
    setPhase("downloading");
    setMessage("");
    try {
      await invoke("plugin:qqorvex-updater|download_update", { request: { url: target.url, sha256: target.sha256 } });
      setDownloaded(true);
      writeJson(DOWNLOADED_VERSION_KEY, target.version);
      setPhase("ready");
      return true;
    } catch (error) {
      setPhase("error");
      setMessage(
        automatic
          ? "O download automático não terminou. Tente de novo quando quiser."
          : error instanceof Error ? error.message : "Não foi possível baixar a atualização. Tente novamente.",
      );
      return false;
    }
  }, []);

  const install = useCallback(async (target: AppUpdate, automatic: boolean) => {
    setMessage("");
    setPhase("installing");
    if (automatic) writeJson(AUTO_INSTALL_KEY, { version: target.version, at: Date.now() } satisfies AutoInstallAttempt);
    try {
      const result = await invoke<{ status: string }>("plugin:qqorvex-updater|install_update");
      switch (result.status) {
        case "permission_required":
          setPhase("permission");
          setMessage("Permita que o Qqorvex instale atualizações nas configurações do Android. Depois volte e toque em Instalar.");
          break;
        case "user_action_required":
          setPhase("confirm");
          setMessage("O Android pediu sua confirmação para concluir a atualização.");
          break;
        case "installer_opened":
          setPhase("ready");
          setMessage("Confirme a atualização na tela do Android para concluir.");
          break;
        default:
          setPhase("ready");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "O Android não conseguiu abrir o instalador.";
      if (detail.includes("Baixe e valide a atualização antes de instalar")) {
        setDownloaded(false);
        removeKeys(DOWNLOADED_VERSION_KEY);
      }
      setPhase("error");
      setMessage(detail);
    }
  }, []);

  const checkForUpdate = useCallback(async (force = false) => {
    if (!isAndroidApp()) return;
    let device: DeviceInfo;
    try {
      device = await readDevice();
      state.current.device = device;
    } catch (error) {
      console.warn("Não foi possível ler os dados do aparelho para atualizar o Qqorvex.", error);
      return;
    }

    const cached = readJson<CheckCache>(CHECK_CACHE_KEY);
    let found: AppUpdate | null = cached?.update ?? null;
    if (force || !cached || Date.now() - cached.checkedAt >= CHECK_INTERVAL_MS) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(REPOSITORY_RELEASES_API, {
          headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`GitHub respondeu HTTP ${response.status}.`);
        const releases = await response.json() as GithubRelease[];
        found = findAvailableUpdate(releases, __QQORVEX_APP_VERSION__, device.architecture, __QQORVEX_UPDATE_CHANNEL__);
        writeJson(CHECK_CACHE_KEY, { checkedAt: Date.now(), update: found } satisfies CheckCache);
      } catch (error) {
        console.warn("Não foi possível conferir atualizações do Qqorvex.", error);
        // Reduz tentativas repetidas quando a rede está offline ou o limite público da API é atingido.
        writeJson(CHECK_CACHE_KEY, { checkedAt: Date.now() - CHECK_INTERVAL_MS + 60_000, update: found } satisfies CheckCache);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    setUpdate(found);
    if (!found) return;
    const isDownloaded = readJson<string>(DOWNLOADED_VERSION_KEY) === found.version;
    setDownloaded(isDownloaded);
    if (isDownloaded) {
      if (state.current.phase === "idle") setPhase("ready");
      return;
    }
    const busy = state.current.phase === "downloading" || state.current.phase === "installing";
    if (shouldAutoDownload({ metered: device.metered, downloaded: isDownloaded, busy })) void download(found, true);
  }, [download]);

  useEffect(() => {
    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), 30 * 60 * 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Voltou ainda na versão antiga com a instalação "em curso": o Android não concluiu (ou espera
        // confirmação). Libera o botão para uma nova tentativa manual.
        if (state.current.phase === "installing") setPhase(state.current.downloaded ? "ready" : "idle");
        void checkForUpdate();
        return;
      }
      // Saiu do app: momento de instalar sem atrapalhar. Ao voltar, a versão nova já abre.
      const { update: target, downloaded: ready, device, phase: current } = state.current;
      if (!target || !device || current === "installing" || current === "downloading") return;
      const allowed = shouldAutoInstall({
        version: target.version,
        downloaded: ready,
        canInstall: device.canInstall,
        lastAttempt: readJson<AutoInstallAttempt>(AUTO_INSTALL_KEY),
        now: Date.now(),
      });
      if (allowed) void install(target, true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkForUpdate, install]);

  const beginUpdate = async () => {
    if (!update) return;
    if (!downloaded && !(await download(update, false))) return;
    await install(update, false);
  };

  if (!update || dismissed === update.version) return null;

  const busy = phase === "downloading" || phase === "installing";
  const summary =
    message ||
    (phase === "ready"
      ? "Pronta para instalar. Ela será aplicada quando você sair do app, ou toque em Instalar agora."
      : phase === "downloading"
        ? "Baixando em segundo plano. Você pode continuar usando o app."
        : update.notes || "Baixe e instale a atualização pelo próprio app.");

  return (
    <section className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 sm:mx-6 lg:mx-8" role="status" aria-live="polite">
      <ArrowCircleUp size={24} weight="duotone" className="shrink-0 text-gold" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Qqorvex {update.version} está disponível</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{summary}</p>
        {phase === "downloading" && <p className="mt-1 flex items-center gap-2 text-sm text-gold"><ArrowClockwise className="animate-spin" /> Baixando e verificando o APK…</p>}
        {phase === "permission" && <p className="mt-1 flex items-center gap-2 text-sm text-gold"><WarningCircle /> O Android exige autorização da fonte antes de instalar.</p>}
        {phase === "error" && <p className="mt-1 flex items-center gap-2 text-sm text-danger"><WarningCircle /> A atualização continua disponível para uma nova tentativa.</p>}
      </div>
      <button type="button" onClick={() => void beginUpdate()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold px-4 py-2 font-semibold text-canvas transition hover:brightness-105 disabled:opacity-60">
        {downloaded ? <CheckCircle size={18} /> : <DownloadSimple size={18} />}
        {phase === "downloading" ? "Baixando…" : phase === "installing" ? "Instalando…" : downloaded ? "Instalar agora" : "Atualizar agora"}
      </button>
      <button type="button" onClick={() => { writeJson(DISMISSED_VERSION_KEY, update.version); setDismissed(update.version); }} className="rounded-lg p-2 text-ink-muted hover:bg-canvas/60 hover:text-ink" aria-label="Ocultar aviso de atualização">
        <X size={18} />
      </button>
      <p className="basis-full pl-9 text-xs text-ink-muted">
        {state.current.device?.canInstall
          ? "O APK é verificado antes da instalação. O Android pode pedir confirmação em algumas atualizações."
          : "Na primeira vez, o Android pede autorização para o Qqorvex instalar atualizações."}
      </p>
    </section>
  );
}
