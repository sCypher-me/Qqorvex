import { useEffect } from "react";
import { useAuth } from "@qqorvex/auth";
import { useAccount } from "./account";
import { VIP_THEME, useTheme } from "./ThemeContext";

/** A cor Coroa Vex só vale com o Plus ativo: quando a assinatura acaba, volta ao Ouro (aqui e na conta). */
export function useVipSkinGuard() {
  const { client, session } = useAuth();
  const { isPlus, planLoading } = useAccount();
  const { skin, setSkin } = useTheme();

  useEffect(() => {
    if (planLoading || isPlus || skin !== VIP_THEME.id || !session) return;
    setSkin("default");
    const saved = session.user.user_metadata.qqorvex_preferences;
    const preferences = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
    void client.auth.updateUser({ data: { qqorvex_preferences: { ...preferences, skin: "default" } } });
  }, [client, isPlus, planLoading, session, setSkin, skin]);
}
