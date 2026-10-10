import { focusManager } from "@tanstack/react-query";

/**
 * Sessão sempre válida antes de buscar dados.
 *
 * Quando o computador acorda ou o app volta do segundo plano, o React Query refaz todas as consultas
 * no mesmo instante em que o token de acesso já venceu — os logs mostraram rajadas de 401 em todas as
 * tabelas por ~2 minutos até a renovação automática acontecer. Aqui o foco só dispara a nova busca
 * depois de `getSession()` (que renova o token vencido), e um 401 de sessão força uma renovação única
 * antes da nova tentativa.
 */

const SESSION_WAIT_TIMEOUT_MS = 6_000;
const AUTH_ERROR_CODES = new Set(["PGRST301", "PGRST302", "PGRST303", "401"]);
const AUTH_ERROR_MESSAGE = /jwt (expired|malformed)|invalid jwt|token (is )?(expired|invalid)|invalid (api key|token)|not authenticated/i;

export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
  if (status === 401) return true;
  if (typeof code === "string" && AUTH_ERROR_CODES.has(code)) return true;
  return typeof message === "string" && AUTH_ERROR_MESSAGE.test(message);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), ms))]);
}

/** Garante um token não vencido (renova se preciso). Nunca rejeita: no pior caso, segue sem esperar. */
export async function waitForFreshSession(): Promise<void> {
  try {
    const { supabase } = await import("./supabase");
    await withTimeout(supabase.auth.getSession(), SESSION_WAIT_TIMEOUT_MS);
  } catch {
    /* sem rede: a consulta falha normalmente e o React Query tenta de novo */
  }
}

let refreshInFlight: Promise<void> | null = null;

/** Uma única renovação para várias consultas que falharam juntas com 401. */
export function refreshSessionOnce(): Promise<void> {
  refreshInFlight ??= (async () => {
    try {
      const { supabase } = await import("./supabase");
      await withTimeout(supabase.auth.refreshSession(), SESSION_WAIT_TIMEOUT_MS);
    } catch {
      /* a sessão pode ter sido encerrada; o AuthProvider leva ao login */
    } finally {
      window.setTimeout(() => {
        refreshInFlight = null;
      }, 5_000);
    }
  })();
  return refreshInFlight;
}

/** Só considera a aba "em foco" (e refaz consultas) depois que a sessão estiver renovada. */
export function installSessionAwareFocus() {
  focusManager.setEventListener((handleFocus) => {
    if (typeof window === "undefined") return undefined;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        handleFocus(false);
        return;
      }
      void waitForFreshSession().finally(() => handleFocus(true));
    };
    window.addEventListener("visibilitychange", onVisibility, false);
    return () => window.removeEventListener("visibilitychange", onVisibility);
  });
}

export function retryQuery(failureCount: number, error: unknown): boolean {
  if (isAuthSessionError(error)) {
    void refreshSessionOnce();
    return failureCount < 2;
  }
  return failureCount < 1;
}

export function retryQueryDelay(failureCount: number, error: unknown): number {
  // Depois de um 401 a nova tentativa espera a renovação do token terminar.
  if (isAuthSessionError(error)) return 1_500;
  return Math.min(1_000 * 2 ** failureCount, 30_000);
}
