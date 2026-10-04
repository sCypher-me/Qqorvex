import { useCallback, useEffect, useState } from "react";
import { useToast } from "@qqorvex/ui";
import { BADGE_CATALOG, GAMIFICATION_UPDATED_EVENT, SPECIAL_BADGE_CATALOG, syncGamificationBadges } from "@qqorvex/module-gamificacao";
import { supabase } from "./supabase";

interface BadgeNotice {
  key: string;
  label: string;
  description: string;
}

const BADGE_BY_KEY = new Map(
  [...BADGE_CATALOG, ...SPECIAL_BADGE_CATALOG].map((badge) => [badge.key, badge] as const),
);

function noticeForBadge(key: string): BadgeNotice {
  if (key.startsWith("level:")) {
    const level = key.slice("level:".length);
    return { key, label: `Nível ${level}`, description: `Você alcançou o nível ${level}. Sua insígnia agora representa este nível.` };
  }
  const badge = BADGE_BY_KEY.get(key);
  return {
    key,
    label: badge?.label ?? "Uma nova insígnia",
    description: badge?.description ?? "Uma nova conquista foi adicionada à sua conta.",
  };
}

/** Busca avisos persistentes para também celebrar badges concedidos enquanto a conta estava offline. */
export function BadgeUnlockNotifier({ userId }: { userId: string }) {
  const { toast, dismiss } = useToast();
  const [queue, setQueue] = useState<BadgeNotice[]>([]);
  const [active, setActive] = useState<BadgeNotice | null>(null);

  const claimNotifications = useCallback(async () => {
    const { data, error } = await supabase.rpc("claim_my_badge_notifications");
    if (error) {
      console.warn("Não foi possível carregar os avisos de insígnias:", error);
    }

    const notices = (data ?? []).map((notification) => noticeForBadge(notification.badge_key));
    if (notices.length > 0) {
      setQueue((current) => [...current, ...notices]);
      window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT, { detail: { userId, notificationsClaimed: true } }));
    }
  }, [userId]);

  useEffect(() => {
    const onGamificationUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; notificationsClaimed?: boolean }>).detail;
      if (detail?.userId !== userId || detail.notificationsClaimed) return;
      void claimNotifications();
    };
    window.addEventListener(GAMIFICATION_UPDATED_EVENT, onGamificationUpdated);
    const channel = supabase
      .channel(`badge-notices:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_badge_notifications",
        filter: `user_id=eq.${userId}`,
      }, () => void claimNotifications())
      .subscribe();
    void syncGamificationBadges(supabase, userId)
      .catch((error) => console.warn("Não foi possível sincronizar as insígnias:", error))
      .finally(() => void claimNotifications());
    return () => {
      window.removeEventListener(GAMIFICATION_UPDATED_EVENT, onGamificationUpdated);
      void supabase.removeChannel(channel);
    };
  }, [claimNotifications, userId]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const next = queue[0];
    if (!next) return;
    setActive(next);
    setQueue((current) => current.slice(1));
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    const toastId = toast({
      title: active.key.startsWith("level:") ? "Novo badge de nível" : "Novo badge desbloqueado!",
      description: `${active.label} · ${active.description}`,
      tone: "achievement",
      duration: 5_000,
    });
    const timer = window.setTimeout(() => setActive(null), 5_050);
    return () => {
      window.clearTimeout(timer);
      if (toastId) dismiss(toastId);
    };
  }, [active, dismiss, toast]);

  return null;
}
