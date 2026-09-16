import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createAssessment,
  createErrorDoubt,
  createFlashcard,
  createQuizAttempt,
  createSummary,
  createTopic,
  listAssessments,
  listErrorsDoubts,
  listFlashcards,
  listQuizAttempts,
  listQuizQuestions,
  listQuizzes,
  listSummaries,
  listTopics,
  resolveErrorDoubt,
  reviewFlashcard,
} from "../repository";
import type { Flashcard, FlashcardReviewGrade, NewFlashcardInput } from "../types";

const topicsKey = (notebookId: string) => ["topics", notebookId] as const;
const summariesKey = (notebookId: string) => ["summaries", notebookId] as const;
const flashcardsKey = (notebookId: string) => ["flashcards", notebookId] as const;
const errorsDoubtsKey = (notebookId: string) => ["errors-doubts", notebookId] as const;
const assessmentsKey = (notebookId: string) => ["assessments", notebookId] as const;
const quizzesKey = (notebookId: string) => ["quizzes", notebookId] as const;
const quizQuestionsKey = (quizId: string) => ["quiz-questions", quizId] as const;
const quizAttemptsKey = (quizId: string) => ["quiz-attempts", quizId] as const;

export function useAssessments(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: assessmentsKey(notebookId), queryFn: () => listAssessments(client, notebookId) });
  return { assessments: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateAssessment(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; assessmentDate?: string }) => createAssessment(client, notebookId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assessmentsKey(notebookId) }),
  });
}

export function useTopics(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: topicsKey(notebookId), queryFn: () => listTopics(client, notebookId) });
  return { topics: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateTopic(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, parentTopicId }: { title: string; parentTopicId?: string }) =>
      createTopic(client, notebookId, title, parentTopicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicsKey(notebookId) }),
  });
}

export function useSummaries(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: summariesKey(notebookId), queryFn: () => listSummaries(client, notebookId) });
  return { summaries: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateSummary(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string; topicId?: string }) =>
      createSummary(client, notebookId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: summariesKey(notebookId) }),
  });
}

export function useFlashcards(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({ queryKey: flashcardsKey(notebookId), queryFn: () => listFlashcards(client, notebookId) });
  return { flashcards: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateFlashcard(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewFlashcardInput) => createFlashcard(client, notebookId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flashcardsKey(notebookId) }),
  });
}

export function useReviewFlashcard(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flashcard, grade }: { flashcard: Flashcard; grade: FlashcardReviewGrade }) =>
      reviewFlashcard(client, flashcard, grade),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flashcardsKey(notebookId) }),
  });
}

export function useErrorsDoubts(client: SupabaseClient<Database>, notebookId: string) {
  const query = useQuery({
    queryKey: errorsDoubtsKey(notebookId),
    queryFn: () => listErrorsDoubts(client, notebookId),
  });
  return { errorsDoubts: query.data ?? [], isLoading: query.isLoading };
}

export function useCreateErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (description: string) => createErrorDoubt(client, notebookId, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: errorsDoubtsKey(notebookId) }),
  });
}

export function useResolveErrorDoubt(client: SupabaseClient<Database>, notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isResolved }: { id: string; isResolved: boolean }) =>
      resolveErrorDoubt(client, id, isResolved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: errorsDoubtsKey(notebookId) }),
  });
}

/** Quiz é criado só pela ferramenta da Vex (fora deste hook) — aqui só há leitura e responder. */
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
    mutationFn: ({ quizId, answers, score }: { quizId: string; answers: number[]; score: number }) =>
      createQuizAttempt(client, userId, quizId, answers, score),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: quizAttemptsKey(variables.quizId) }),
  });
}
