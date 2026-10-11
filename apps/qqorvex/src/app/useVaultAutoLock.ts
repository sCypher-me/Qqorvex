import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Database, SupabaseClient } from "@qqorvex/database";

/** Sem toque, tecla ou rolagem por esse tempo, o Cofre aberto se fecha sozinho. */
export const VAULT_IDLE_LOCK_MS = 5 * 60_000;

// Mesmas chaves de `@qqorvex/module-documentos` (não importado aqui para não pesar o carregamento inicial).
const DOCUMENTS_KEY = ["documents"] as const;
const VAULT_STATUS_KEY = ["documents", "vault-status"] as const;

/**
 * Fecha o Cofre aberto quando o app vai para segundo plano (aba escondida, app minimizado no
 * celular) e depois de alguns minutos sem uso. O servidor já limita a 15 minutos e encerra junto
 * com a sessão; isto fecha antes. Só age quando a tela de Documentos registrou o Cofre aberto —
 * não faz chamadas à toa.
 */
export function useVaultAutoLock(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let lastActivity = Date.now();
    let locking = false;
    const isOpen = () => {
      const status = queryClient.getQueryData<{ unlockedUntil: string | null }>(VAULT_STATUS_KEY);
      return Boolean(status?.unlockedUntil && new Date(status.unlockedUntil).getTime() > Date.now());
    };
    const lock = () => {
      if (locking || !isOpen()) return;
      locking = true;
      queryClient.setQueryData<{ unlockedUntil: string | null; count: number }>(VAULT_STATUS_KEY, (current) => (current ? { ...current, unlockedUntil: null } : current));
      void Promise.resolve(client.rpc("lock_vault"))
        .catch(() => undefined)
        .finally(() => {
          locking = false;
          void queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lock();
    };
    const onActivity = () => {
      lastActivity = Date.now();
    };
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= VAULT_IDLE_LOCK_MS) lock();
    }, 20_000);
    const activityEvents = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", lock);
    activityEvents.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }));
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", lock);
      activityEvents.forEach((name) => window.removeEventListener(name, onActivity, { capture: true }));
    };
  }, [client, queryClient]);
}
