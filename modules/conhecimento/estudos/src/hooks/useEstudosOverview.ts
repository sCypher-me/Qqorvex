import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listDueFlashcards, listNotebookStats, listStudySessionsSince, listUpcomingAssessments } from "../repository";
import { getLocalDateKey } from "../service";

/** Cartões vencidos (todos os cadernos) e avaliações dos próximos `days` dias. */
export function useEstudosOverview(client: SupabaseClient<Database>, days = 7) {
  const todayDate = new Date();
  const today = getLocalDateKey(todayDate);
  const endDate = new Date(todayDate);
  endDate.setDate(endDate.getDate() + days);
  const query = useQuery({
    queryKey: ["estudos-overview", today, days],
    queryFn: async () => {
      const [dueFlashcards, upcomingAssessments] = await Promise.all([
        listDueFlashcards(client, today),
        listUpcomingAssessments(client, today, getLocalDateKey(endDate)),
      ]);
      return { dueFlashcards, upcomingAssessments: [...upcomingAssessments].sort((a, b) => (a.assessment_date ?? "").localeCompare(b.assessment_date ?? "")) };
    },
  });

  return {
    dueFlashcards: query.data?.dueFlashcards ?? [],
    upcomingAssessments: query.data?.upcomingAssessments ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Resumos, cartões e revisões vencidas por caderno. */
export function useNotebookStats(client: SupabaseClient<Database>) {
  const today = getLocalDateKey();
  const query = useQuery({ queryKey: ["estudos-stats", today], queryFn: () => listNotebookStats(client, today) });
  return { stats: query.data ?? {}, isLoading: query.isLoading };
}

export interface StudyDay {
  date: string;
  minutes: number;
}

/** Minutos estudados em cada um dos últimos 7 dias (hoje incluso), somando todos os cadernos. */
export function useStudyWeek(client: SupabaseClient<Database>) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const query = useQuery({
    queryKey: ["estudos-week", getLocalDateKey(today)],
    queryFn: () => listStudySessionsSince(client, start.toISOString()),
  });
  const days: StudyDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date: getLocalDateKey(date), minutes: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const session of query.data ?? []) {
    const day = byDate.get(getLocalDateKey(new Date(session.occurred_at)));
    if (day) day.minutes += session.duration_minutes ?? 0;
  }
  return { days, total: days.reduce((sum, day) => sum + day.minutes, 0), sessions: query.data ?? [], isLoading: query.isLoading };
}
