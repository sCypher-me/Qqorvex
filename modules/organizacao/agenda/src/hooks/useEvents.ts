import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent, createZoomMeeting, deleteEvent, listAllEvents, listEventsInRange } from "../repository";
import type { NewEventInput } from "../types";

const eventsKey = (rangeStartIso: string, rangeEndIso: string) => ["events", rangeStartIso, rangeEndIso] as const;

export function useEventsInRange(client: SupabaseClient<Database>, rangeStart: Date, rangeEnd: Date) {
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();
  const query = useQuery({
    queryKey: eventsKey(rangeStartIso, rangeEndIso),
    queryFn: () => listEventsInRange(client, rangeStartIso, rangeEndIso),
  });
  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error };
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

/** Cria a reunião no Zoom e, com o link retornado, cria o evento na Agenda numa única ação. */
export function useCreateZoomMeeting(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; startAt: string; endAt: string }) => {
      const { joinUrl } = await createZoomMeeting(client, input);
      return createEvent(client, userId, {
        title: input.title,
        startAt: input.startAt,
        endAt: input.endAt,
        category: "reuniao",
        meetingLink: joinUrl,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
