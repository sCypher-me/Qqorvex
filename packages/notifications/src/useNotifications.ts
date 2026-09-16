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
    if (!supported) {
      setIsLoading(false);
      return;
    }
    const registration = await registerServiceWorker();
    const existing = await getExistingSubscription(registration);
    setIsSubscribed(!!existing);
    setIsLoading(false);
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function enable() {
    setError(null);
    if (!supported) {
      setError("Este navegador não suporta notificações push.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Permissão de notificações negada.");
      return;
    }
    try {
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
    const registration = await registerServiceWorker();
    await unsubscribeCurrentDevice(client, registration);
    setIsSubscribed(false);
  }

  return { supported, isSubscribed, isLoading, error, enable, disable };
}
