import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addPageToBase,
  createBase,
  createBaseFormula,
  deleteBase,
  deleteBaseFormula,
  listBaseFormulas,
  listBasePages,
  listBases,
  listPropertiesForPages,
  removePageFromBase,
  updateBaseViewConfig,
} from "../repository";
import type { BaseViewConfig } from "../types";

const BASES_KEY = ["sc-bases"] as const;
const basePagesKey = (baseId: string) => ["sc-base-pages", baseId] as const;
const baseFormulasKey = (baseId: string) => ["sc-base-formulas", baseId] as const;
const basePropertiesKey = (baseId: string) => ["sc-base-properties", baseId] as const;

export function useBases(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: BASES_KEY, queryFn: () => listBases(client) });
  return { bases: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateBase(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBase(client, userId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASES_KEY }),
  });
}

export function useDeleteBase(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (baseId: string) => deleteBase(client, baseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASES_KEY }),
  });
}

export function useUpdateBaseViewConfig(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ baseId, viewConfig }: { baseId: string; viewConfig: BaseViewConfig }) =>
      updateBaseViewConfig(client, baseId, viewConfig),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BASES_KEY }),
  });
}

export function useBasePages(client: SupabaseClient<Database>, baseId: string) {
  const query = useQuery({ queryKey: basePagesKey(baseId), queryFn: () => listBasePages(client, baseId) });
  return { pages: query.data ?? [], isLoading: query.isLoading };
}

export function useAddPageToBase(client: SupabaseClient<Database>, baseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => addPageToBase(client, baseId, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: basePagesKey(baseId) }),
  });
}

export function useRemovePageFromBase(client: SupabaseClient<Database>, baseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => removePageFromBase(client, baseId, pageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: basePagesKey(baseId) }),
  });
}

export function useBaseFormulas(client: SupabaseClient<Database>, baseId: string) {
  const query = useQuery({ queryKey: baseFormulasKey(baseId), queryFn: () => listBaseFormulas(client, baseId) });
  return { formulas: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateBaseFormula(client: SupabaseClient<Database>, baseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, expression }: { key: string; expression: string }) => createBaseFormula(client, baseId, key, expression),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseFormulasKey(baseId) }),
  });
}

export function useDeleteBaseFormula(client: SupabaseClient<Database>, baseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formulaId: string) => deleteBaseFormula(client, formulaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseFormulasKey(baseId) }),
  });
}

export function useBasePageProperties(client: SupabaseClient<Database>, baseId: string, pageIds: string[]) {
  const query = useQuery({
    queryKey: basePropertiesKey(baseId),
    queryFn: () => listPropertiesForPages(client, pageIds),
    enabled: pageIds.length > 0,
  });
  return { properties: query.data ?? [], isLoading: query.isLoading };
}
