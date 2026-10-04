import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent, deleteEvent, listAllEvents, listEventsInRange, updateEvent } from "../repository";
import type { NewEventInput } from "../types";

const eventsKey = (rangeStartIso: string, rangeEndIso: string) => ["events", rangeStartIso, rangeEndIso] as const;

export function useEventsInRange(client: SupabaseClient<Database>, rangeStart: Date, rangeEnd: Date) {
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();
  const query = useQuery({
    queryKey: eventsKey(rangeStartIso, rangeEndIso),
    queryFn: () => listEventsInRange(client, rangeStartIso, rangeEndIso),
  });
  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useAllEvents(client: SupabaseClient<Database>) {
  const query = useQuery({ queryKey: ["events", "all"], queryFn: () => listAllEvents(client) });
  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateEvent(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEventInput) => createEvent(client, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(client, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: NewEventInput }) => updateEvent(client, eventId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
