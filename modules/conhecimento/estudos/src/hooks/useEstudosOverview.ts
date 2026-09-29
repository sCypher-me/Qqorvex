import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listDueFlashcards, listUpcomingAssessments } from "../repository";
import { getLocalDateKey } from "../service";

export function useEstudosOverview(client: SupabaseClient<Database>) {
  const todayDate = new Date();
  const today = getLocalDateKey(todayDate);
  const endDate = new Date(todayDate);
  endDate.setDate(endDate.getDate() + 7);
  const query = useQuery({
    queryKey: ["estudos-overview", today],
    queryFn: async () => {
      const [dueFlashcards, upcomingAssessments] = await Promise.all([
        listDueFlashcards(client, today),
        listUpcomingAssessments(client, today, getLocalDateKey(endDate)),
      ]);
      return { dueFlashcards, upcomingAssessments };
    },
  });

  return {
    dueFlashcards: query.data?.dueFlashcards ?? [],
    upcomingAssessments: query.data?.upcomingAssessments ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
