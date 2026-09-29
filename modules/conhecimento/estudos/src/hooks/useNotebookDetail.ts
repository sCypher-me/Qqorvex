import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createAssessment,
  createErrorDoubt,
  createFlashcard,
  createQuizAttempt,
  createSummary,
  createStudySession,
  createTopic,
  deleteAssessment,
  deleteErrorDoubt,
  deleteFlashcard,
  deleteStudySession,
  deleteSummary,
  deleteTopic,
  updateAssessment,
  updateErrorDoubt,
  updateFlashcard,
  updateSummary,
  updateTopic,
  listAssessments,
  listErrorsDoubts,
  listFlashcards,
  listQuizAttempts,
  listQuizQuestions,
  listQuizzes,
  listSummaries,
  listStudySessions,
  listTopics,
  resolveErrorDoubt,
  reviewFlashcard,
} from "../repository";
import type { Flashcard, FlashcardReviewGrade, NewFlashcardInput, NewStudySessionInput } from "../types";

const topicsKey = (notebookId: string) => ["topics", notebookId] as const;
const summariesKey = (notebookId: string) => ["summaries", notebookId] as const;
const flashcardsKey = (notebookId: string) => ["flashcards", notebookId] as const;
const errorsDoubtsKey = (notebookId: string) => ["errors-doubts", notebookId] as const;
const assessmentsKey = (notebookId: string) => ["assessments", notebookId] as const;
const quizzesKey = (notebookId: string) => ["quizzes", notebookId] as const;
const quizQuestionsKey = (quizId: string) => ["quiz-questions", quizId] as const;
const quizAttemptsKey = (quizId: string) => ["quiz-attempts", quizId] as const;
const studySessionsKey = (notebookId: string) => ["study-sessions", notebookId] as const;

/** Visões agregadas (lista de cadernos, Hoje, semana) que dependem do conteúdo dos cadernos. */
export function invalidateEstudosAggregates(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["estudos-overview"] });
  void queryClient.invalidateQueries({ queryKey: ["estudos-stats"] });
  void queryClient.invalidateQueries({ queryKey: ["estudos-week"] });
  void queryClient.invalidateQueries({ queryKey: ["hoje"] });
}

function useInvalidate(...keys: ReadonlyArray<readonly unknown[]>) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    invalidateEstudosAggregates(queryClient);
  };
}

export function useAssessments(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: assessmentsKey(notebookId), queryFn: () => listAssessments(client, notebookId) });
  return { assessments: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateAssessment(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(assessmentsKey(notebookId));
  return useMutation({ mutationFn: (input: { name: string; assessmentDate?: string; expectedContent?: string }) => createAssessment(client, notebookId, input), onSuccess });
}

/** Também invalida a Agenda: editar a data move o evento da avaliação, se existir. */
export function useUpdateAssessment(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(assessmentsKey(notebookId), ["events"]);
  return useMutation({
    mutationFn: ({ assessmentId, input }: { assessmentId: string; input: { name: string; assessmentDate?: string; expectedContent?: string } }) =>
      updateAssessment(client, assessmentId, input),
    onSuccess,
  });
}

export function useDeleteAssessment(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(assessmentsKey(notebookId));
  return useMutation({ mutationFn: (assessmentId: string) => deleteAssessment(client, assessmentId), onSuccess });
}

export function useStudySessions(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: studySessionsKey(notebookId), queryFn: () => listStudySessions(client, notebookId) });
  return { studySessions: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateStudySession(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(studySessionsKey(notebookId));
  return useMutation({ mutationFn: (input: NewStudySessionInput) => createStudySession(client, notebookId, input), onSuccess });
}

export function useDeleteStudySession(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(studySessionsKey(notebookId));
  return useMutation({ mutationFn: (sessionId: string) => deleteStudySession(client, sessionId), onSuccess });
}

export function useTopics(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: topicsKey(notebookId), queryFn: () => listTopics(client, notebookId) });
  return { topics: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateTopic(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(topicsKey(notebookId));
  return useMutation({
    mutationFn: ({ title, parentTopicId }: { title: string; parentTopicId?: string }) => createTopic(client, notebookId, title, parentTopicId),
    onSuccess,
  });
}

export function useUpdateTopic(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(topicsKey(notebookId));
  return useMutation({ mutationFn: ({ topicId, title }: { topicId: string; title: string }) => updateTopic(client, topicId, title), onSuccess });
}

export function useDeleteTopic(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(topicsKey(notebookId), summariesKey(notebookId));
  return useMutation({ mutationFn: (topicId: string) => deleteTopic(client, topicId), onSuccess });
}

export function useSummaries(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: summariesKey(notebookId), queryFn: () => listSummaries(client, notebookId) });
  return { summaries: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateSummary(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(summariesKey(notebookId));
  return useMutation({ mutationFn: (input: { title: string; content: string; topicId?: string }) => createSummary(client, notebookId, input), onSuccess });
}

export function useUpdateSummary(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(summariesKey(notebookId));
  return useMutation({
    mutationFn: ({ summaryId, input }: { summaryId: string; input: { title: string; content: string; topicId?: string | null } }) => updateSummary(client, summaryId, input),
    onSuccess,
  });
}

export function useDeleteSummary(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(summariesKey(notebookId));
  return useMutation({ mutationFn: (summaryId: string) => deleteSummary(client, summaryId), onSuccess });
}

export function useFlashcards(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: flashcardsKey(notebookId), queryFn: () => listFlashcards(client, notebookId) });
  return { flashcards: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateFlashcard(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(flashcardsKey(notebookId));
  return useMutation({ mutationFn: (input: NewFlashcardInput) => createFlashcard(client, notebookId, input), onSuccess });
}

export function useUpdateFlashcard(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(flashcardsKey(notebookId));
  return useMutation({ mutationFn: ({ flashcardId, front, back }: { flashcardId: string; front: string; back: string }) => updateFlashcard(client, flashcardId, { front, back }), onSuccess });
}

export function useDeleteFlashcard(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(flashcardsKey(notebookId));
  return useMutation({ mutationFn: (flashcardId: string) => deleteFlashcard(client, flashcardId), onSuccess });
}

/** Revisão de um cartão de qualquer caderno (sessão global ou do caderno). */
export function useReviewFlashcard(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flashcard, grade }: { flashcard: Flashcard; grade: FlashcardReviewGrade }) => reviewFlashcard(client, flashcard, grade),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: flashcardsKey(updated.notebook_id) });
      invalidateEstudosAggregates(queryClient);
    },
  });
}

export function useErrorsDoubts(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: errorsDoubtsKey(notebookId), queryFn: () => listErrorsDoubts(client, notebookId) });
  return { errorsDoubts: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(errorsDoubtsKey(notebookId));
  return useMutation({ mutationFn: (description: string) => createErrorDoubt(client, notebookId, description), onSuccess });
}

export function useUpdateErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(errorsDoubtsKey(notebookId));
  return useMutation({ mutationFn: ({ id, description }: { id: string; description: string }) => updateErrorDoubt(client, id, description), onSuccess });
}

export function useResolveErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(errorsDoubtsKey(notebookId));
  return useMutation({ mutationFn: ({ id, isResolved }: { id: string; isResolved: boolean }) => resolveErrorDoubt(client, id, isResolved), onSuccess });
}

export function useDeleteErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const onSuccess = useInvalidate(errorsDoubtsKey(notebookId));
  return useMutation({ mutationFn: (id: string) => deleteErrorDoubt(client, id), onSuccess });
}

export function useQuizzes(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: quizzesKey(notebookId), queryFn: () => listQuizzes(client, notebookId) });
  return { quizzes: query.data ?? [], isLoading: query.isLoading };
}

export function useQuizQuestions(client: SupabaseClient<Database>, quizId: string) {
  const query = useQuery({ queryKey: quizQuestionsKey(quizId), queryFn: () => listQuizQuestions(client, quizId) });
  return { questions: query.data ?? [], isLoading: query.isLoading };
}

export function useQuizAttempts(client: SupabaseClient<Database>, quizId: string) {
  const query = useQuery({ queryKey: quizAttemptsKey(quizId), queryFn: () => listQuizAttempts(client, quizId) });
  return { attempts: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateQuizAttempt(client: SupabaseClient<Database>, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, answers, score }: { quizId: string; answers: number[]; score: number }) => createQuizAttempt(client, userId, quizId, answers, score),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: quizAttemptsKey(variables.quizId) });
      void queryClient.invalidateQueries({ queryKey: ["gamification"] });
    },
  });
}
