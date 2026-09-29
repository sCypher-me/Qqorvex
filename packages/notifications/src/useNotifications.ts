import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  getExistingSubscription,
  isPushSupported,
  registerServiceWorker,
  savePushSubscription,
  subscribeToPush,
  unsubscribeCurrentDevice,
} from "./push";

export function useNotifications(client: SupabaseClient<Database>, userId: string, vapidPublicKey: string) {
  const supported = isPushSupported();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!supported) {
      setIsLoading(false);
      return;
    }
    try {
      const registration = await registerServiceWorker();
      const existing = await getExistingSubscription(registration);
      setIsSubscribed(!!existing);
    } catch (caught) {
      setIsSubscribed(false);
      setError(caught instanceof Error ? caught.message : "Não foi possível verificar as notificações.");
    } finally {
      setIsLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setError(null);
    try {
      if (!supported) {
        setError("Este navegador não suporta notificações push.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permissão de notificações negada.");
        return;
      }
      const registration = await registerServiceWorker();
      const subscription = await subscribeToPush(registration, vapidPublicKey);
      await savePushSubscription(client, userId, subscription);
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações.");
    }
  }

  async function disable() {
    setError(null);
    try {
      const registration = await registerServiceWorker();
      await unsubscribeCurrentDevice(client, registration);
      setIsSubscribed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível desativar as notificações.");
    }
  }

  return { supported, isSubscribed, isLoading, error, enable, disable };
}
