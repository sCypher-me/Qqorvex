import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * Notificações push (Web Push) — mecanismo de entrega genérico usado pela Agenda (lembretes de
 * evento) e, no futuro, por outras fontes (hábitos, orçamento, garantias) sem mudar este pacote.
 * "O app em produção não pode pressupor" nada externo: sem serviço pago, só VAPID + o próprio
 * navegador. As chaves privadas nunca chegam aqui — só a pública, que é segura de expor.
 */

export function isPushSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Converte a chave pública VAPID (base64url) para o formato que `pushManager.subscribe` exige. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function registerServiceWorker(path = "/sw.js"): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(path);
}

export async function getExistingSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(registration: ServiceWorkerRegistration, vapidPublicKey: string): Promise<PushSubscription> {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

function toSubscriptionRow(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh!,
    auth: json.keys!.auth!,
  };
}

export async function savePushSubscription(client: SupabaseClient<Database>, userId: string, subscription: PushSubscription): Promise<void> {
  const row = toSubscriptionRow(subscription);
  const { error } = await client.from("push_subscriptions").upsert({ user_id: userId, ...row }, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function removePushSubscriptionByEndpoint(client: SupabaseClient<Database>, endpoint: string): Promise<void> {
  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

export async function listPushSubscriptions(client: SupabaseClient<Database>) {
  const { data, error } = await client.from("push_subscriptions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function unsubscribeCurrentDevice(client: SupabaseClient<Database>, registration: ServiceWorkerRegistration): Promise<void> {
  const subscription = await getExistingSubscription(registration);
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await removePushSubscriptionByEndpoint(client, endpoint);
}
