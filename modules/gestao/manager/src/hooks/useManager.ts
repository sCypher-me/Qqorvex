import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createPartnerCampaign,
  createRedemptionCode,
  deleteAccount,
  getSystemOverview,
  listAllAccounts,
  listPartnerCampaigns,
  listRedemptionCodes,
  listSecretKeys,
  listWaitlist,
  redeemCode,
  setSecret,
  setWaitlistInvited,
  updatePartnerCampaignEnd,
} from "../repository";
import type { NewRedemptionCodeInput, PartnerCampaignInput } from "../types";

const ACCOUNTS_KEY = ["manager", "accounts"] as const;
const OVERVIEW_KEY = ["manager", "overview"] as const;
const CODES_KEY = ["manager", "codes"] as const;
const SECRETS_KEY = ["manager", "secrets"] as const;
const CAMPAIGNS_KEY = ["manager", "campaigns"] as const;
const WAITLIST_KEY = ["manager", "waitlist"] as const;

export function useAllAccounts(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => listAllAccounts(client) });
  return { accounts: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useDeleteAccount(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => deleteAccount(client, targetUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useSystemOverview(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: OVERVIEW_KEY, queryFn: () => getSystemOverview(client) });
  return { overview: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function useRedemptionCodes(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: CODES_KEY, queryFn: () => listRedemptionCodes(client) });
  return { codes: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateRedemptionCode(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewRedemptionCodeInput) => createRedemptionCode(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CODES_KEY }),
  });
}

/** Resgate (easter egg): ao dar certo, acesso, perfil e insígnias da conta são recarregados. */
export function useRedeemCode(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemCode(client, code),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries();
    },
  });
}

export function useWaitlist(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: WAITLIST_KEY, queryFn: () => listWaitlist(client) });
  return { signups: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useSetWaitlistInvited(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, invited }: { ids: string[]; invited: boolean }) => setWaitlistInvited(client, ids, invited),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAITLIST_KEY }),
  });
}

export function usePartnerCampaigns(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: CAMPAIGNS_KEY, queryFn: () => listPartnerCampaigns(client) });
  return { campaigns: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreatePartnerCampaign(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PartnerCampaignInput) => createPartnerCampaign(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

/** Estender ou encerrar uma campanha. */
export function useUpdatePartnerCampaignEnd(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, endsAt }: { campaignId: string; endsAt: string }) => updatePartnerCampaignEnd(client, campaignId, endsAt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

export function useSecretKeys(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: SECRETS_KEY, queryFn: () => listSecretKeys(client) });
  return { secrets: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useSetSecret(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => setSecret(client, key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SECRETS_KEY }),
  });
}
