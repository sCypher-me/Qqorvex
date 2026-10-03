import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, useAuth, type Profile } from "@qqorvex/auth";
import { hasPlusEntitlement, parseAccountAccess, type AccountAccess } from "../billing/entitlements";
import { supabase } from "./supabase";

/**
 * Conta do usuário logado, compartilhada por todo o shell: perfil, papel de Dono e plano. Antes
 * cada tela buscava o perfil por conta própria; aqui fica uma fonte única em cache (React Query).
 */
interface AccountValue {
  userId: string;
  email: string;
  profile: Profile | null;
  displayName: string;
  firstName: string;
  isOwner: boolean;
  /** Tudo que o Plus libera — também verdadeiro para quem é Ilimitado. */
  isPlus: boolean;
  /** Lifetime, Parceiro com campanha ativa ou Dono: nenhuma cota. */
  isUnlimited: boolean;
  access: AccountAccess | null;
  /** Assinatura ainda carregando — não trate como "sem Plus" nesse intervalo. */
  planLoading: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const AccountContext = createContext<AccountValue | null>(null);

export const ACCOUNT_PROFILE_KEY = "account-profile";
export const ACCOUNT_SUBSCRIPTION_KEY = "account-subscription";
export const ACCOUNT_ACCESS_KEY = "account-access";

export function AccountProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session!.user.id;
  const email = session!.user.email ?? "";

  const profileQuery = useQuery({
    queryKey: [ACCOUNT_PROFILE_KEY, userId],
    queryFn: () => getProfile(supabase, userId),
    staleTime: 60_000,
  });

  const subscriptionQuery = useQuery({
    queryKey: [ACCOUNT_SUBSCRIPTION_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("plan_key,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const accessQuery = useQuery({
    queryKey: [ACCOUNT_ACCESS_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_access");
      if (error) return null;
      return parseAccountAccess(data);
    },
    staleTime: 5 * 60_000,
  });

  const profile = profileQuery.data ?? null;
  const metadataName = typeof session!.user.user_metadata?.full_name === "string" ? (session!.user.user_metadata.full_name as string) : "";
  const displayName = profile?.display_name || profile?.full_name || metadataName || profile?.username || email.split("@")[0] || "Você";
  const isOwner = profile?.role === "dono";
  const access = accessQuery.data ?? null;
  const isUnlimited = isOwner || access?.level === "unlimited";

  const value: AccountValue = {
    userId,
    email,
    profile,
    displayName,
    firstName: displayName.trim().split(/\s+/)[0] ?? displayName,
    isOwner,
    isPlus: isUnlimited || access?.level === "plus" || hasPlusEntitlement(subscriptionQuery.data, Date.now(), isOwner),
    isUnlimited,
    access,
    planLoading: subscriptionQuery.isLoading || profileQuery.isLoading || accessQuery.isLoading,
    isLoading: profileQuery.isLoading,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: [ACCOUNT_PROFILE_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [ACCOUNT_SUBSCRIPTION_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [ACCOUNT_ACCESS_KEY, userId] });
    },
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount precisa estar dentro de AccountProvider");
  return value;
}
