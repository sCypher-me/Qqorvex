import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createRecurringEvent, listRecurringEvents, updateRecurringEventStatus } from "../repository";
import type { RecurringEvent, RecurringEventFrequency } from "../types";

const RECURRING_EVENTS_KEY = ["recurring-events"] as const;

export function useRecurringEvents(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: RECURRING_EVENTS_KEY, queryFn: () => listRecurringEvents(client) });
  return { recurringEvents: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateRecurringEvent(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; isAllDay?: boolean; startTime?: string; endTime?: string; frequency: RecurringEventFrequency; startDate: string }) =>
      createRecurringEvent(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_EVENTS_KEY }),
  });
}

export function useUpdateRecurringEventStatus(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecurringEvent["status"] }) => updateRecurringEventStatus(client, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_EVENTS_KEY }),
  });
}
