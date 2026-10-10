import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Atualização do app web sem queda.
 *
 * Cada deploy no Cloudflare Pages troca os arquivos com hash em `/assets`. Uma aba aberta antes do
 * deploy ainda aponta para os pedaços antigos: ao abrir outra tela, o `import()` falha e a página
 * quebraria. Aqui essa falha vira uma recarga única e silenciosa na mesma URL, que já baixa a versão
 * nova. Uma trava em `sessionStorage` impede laço de recarga se o problema for outro (rede caída).
 */

const RELOAD_GUARD_KEY = "qqorvex.web-update.reloaded-at";
const RELOAD_GUARD_WINDOW_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
  /is not a valid JavaScript MIME type/i,
  /ChunkLoadError/i,
  /Loading (CSS )?chunk [\w-]+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

interface GuardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Marca uma recarga e informa se ela é permitida (no máximo uma a cada 30 s por aba). */
export function claimReload(storage: GuardStorage | null, now = Date.now()): boolean {
  if (!storage) return true;
  try {
    const last = Number(storage.getItem(RELOAD_GUARD_KEY));
    if (last > 0 && now - last < RELOAD_GUARD_WINDOW_MS) return false;
    storage.setItem(RELOAD_GUARD_KEY, String(now));
    return true;
  } catch {
    return true;
  }
}

function sessionStore(): GuardStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let reloadPending = false;

/** Uma recarga para a versão nova já foi disparada; erros até lá são consequência dela. */
export function isReloadPending(): boolean {
  return reloadPending;
}

/** Recarrega a página atual para buscar a versão publicada. Devolve `false` se a trava impediu. */
export function reloadForNewVersion(): boolean {
  if (reloadPending) return true;
  if (!claimReload(sessionStore())) return false;
  reloadPending = true;
  window.location.reload();
  return true;
}

/**
 * `React.lazy` que se recupera de um deploy novo: se o pedaço da tela sumiu, recarrega a página
 * (mantendo o fallback do Suspense na tela) em vez de cair no erro geral.
 */
export function lazyWithRecovery<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // Com a recarga já em curso (ex.: disparada pelo `vite:preloadError`), o módulo chega vazio e
      // o erro é outro; segura o fallback do Suspense até a página nova abrir.
      if (isReloadPending() || (isChunkLoadError(error) && reloadForNewVersion())) {
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

/** Captura falhas de pré-carregamento do Vite e de imports dinâmicos fora do `lazy`. */
export function installChunkRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason) && reloadForNewVersion()) event.preventDefault();
  });
}

export interface VersionManifest {
  version: string;
  buildId: string;
}

export function parseVersionManifest(value: unknown): VersionManifest | null {
  if (!value || typeof value !== "object") return null;
  const { version, buildId } = value as Record<string, unknown>;
  if (typeof version !== "string" || typeof buildId !== "string" || !buildId) return null;
  return { version, buildId };
}

/** Busca `/version.json` sem cache e diz se o servidor já tem um build diferente do carregado. */
export async function fetchNewerBuild(currentBuildId: string, signal?: AbortSignal): Promise<VersionManifest | null> {
  const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store", signal });
  if (!response.ok) return null;
  const manifest = parseVersionManifest(await response.json().catch(() => null));
  if (!manifest || manifest.buildId === currentBuildId) return null;
  return manifest;
}
