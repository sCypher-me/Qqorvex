import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createRedemptionCode,
  deleteAccount,
  getSystemOverview,
  listAllAccounts,
  listRedemptionCodes,
  listSecretKeys,
  redeemCode,
  setSecret,
} from "../repository";
import type { NewRedemptionCodeInput } from "../types";

const ACCOUNTS_KEY = ["manager", "accounts"] as const;
const OVERVIEW_KEY = ["manager", "overview"] as const;
const CODES_KEY = ["manager", "codes"] as const;
const SECRETS_KEY = ["manager", "secrets"] as const;

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

export function useRedeemCode(client: SupabaseClient<Database>) {
  return useMutation({ mutationFn: (code: string) => redeemCode(client, code) });
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
