import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  addVehicleImportantDate,
  createAsset,
  createImportantPurchase,
  createShoppingListItem,
  createUsefulContact,
  createVehicle,
  deleteAsset,
  deleteImportantPurchase,
  deleteShoppingListItem,
  deleteUsefulContact,
  deleteVehicle,
  listAssets,
  listImportantPurchases,
  listShoppingListItems,
  listUsefulContacts,
  listVehicleImportantDates,
  listVehicles,
  toggleImportantPurchase,
  toggleShoppingListItem,
} from "../repository";
import type { NewAssetInput, NewImportantPurchaseInput, NewShoppingListItemInput, NewUsefulContactInput, NewVehicleInput } from "../types";

const USEFUL_CONTACTS_KEY = ["useful-contacts"] as const;
const VEHICLES_KEY = ["vehicles"] as const;
const vehicleDatesKey = (vehicleId: string) => ["vehicle-important-dates", vehicleId] as const;
const ASSETS_KEY = ["assets"] as const;
const IMPORTANT_PURCHASES_KEY = ["important-purchases"] as const;
const SHOPPING_LIST_KEY = ["shopping-list-items"] as const;

export function useUsefulContacts(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: USEFUL_CONTACTS_KEY, queryFn: () => listUsefulContacts(client) });
  return { contacts: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateUsefulContact(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewUsefulContactInput) => createUsefulContact(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USEFUL_CONTACTS_KEY }),
  });
}

export function useDeleteUsefulContact(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteUsefulContact(client, contactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USEFUL_CONTACTS_KEY }),
  });
}

export function useVehicles(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: VEHICLES_KEY, queryFn: () => listVehicles(client) });
  return { vehicles: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateVehicle(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewVehicleInput) => createVehicle(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}

export function useDeleteVehicle(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(client, vehicleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}

export function useVehicleImportantDates(client: SupabaseClient<Database>, vehicleId: string) {
  const query = useQuery({ queryKey: vehicleDatesKey(vehicleId), queryFn: () => listVehicleImportantDates(client, vehicleId) });
  return { dates: query.data ?? [], isLoading: query.isLoading };
}

export function useAddVehicleImportantDate(client: SupabaseClient<Database>, vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ label, date }: { label: string; date: string }) => addVehicleImportantDate(client, vehicleId, label, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleDatesKey(vehicleId) }),
  });
}

export function useAssets(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ASSETS_KEY, queryFn: () => listAssets(client) });
  return { assets: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateAsset(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAssetInput) => createAsset(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
  });
}

export function useDeleteAsset(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => deleteAsset(client, assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
  });
}

export function useImportantPurchases(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: IMPORTANT_PURCHASES_KEY, queryFn: () => listImportantPurchases(client) });
  return { purchases: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateImportantPurchase(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewImportantPurchaseInput) => createImportantPurchase(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IMPORTANT_PURCHASES_KEY }),
  });
}

export function useToggleImportantPurchase(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purchaseId, isPurchased }: { purchaseId: string; isPurchased: boolean }) =>
      toggleImportantPurchase(client, purchaseId, isPurchased),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IMPORTANT_PURCHASES_KEY }),
  });
}

export function useDeleteImportantPurchase(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purchaseId: string) => deleteImportantPurchase(client, purchaseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IMPORTANT_PURCHASES_KEY }),
  });
}

export function useShoppingListItems(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: SHOPPING_LIST_KEY, queryFn: () => listShoppingListItems(client) });
  return { items: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateShoppingListItem(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewShoppingListItemInput) => createShoppingListItem(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY }),
  });
}

export function useToggleShoppingListItem(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isPurchased }: { itemId: string; isPurchased: boolean }) => toggleShoppingListItem(client, itemId, isPurchased),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY }),
  });
}

export function useDeleteShoppingListItem(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteShoppingListItem(client, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY }),
  });
}
