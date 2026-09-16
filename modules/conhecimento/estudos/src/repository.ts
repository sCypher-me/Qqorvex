import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent as createAgendaEvent, listEventsByAssessment, type CalendarEvent } from "@qqorvex/module-agenda";
import type { LibraryItem } from "@qqorvex/module-biblioteca";
import { awardXp } from "@qqorvex/module-gamificacao";
import { computeNextReview, type GeneratedQuizQuestion } from "./service";
import type {
  Assessment,
  ErrorDoubt,
  Flashcard,
  FlashcardReviewGrade,
  Notebook,
  NewFlashcardInput,
  NewNotebookInput,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  Summary,
  StudySession,
  Topic,
} from "./types";
import { toFlashcardInsert, toNotebookInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listNotebooks(client: Client): Promise<Notebook[]> {
  const { data, error } = await client.from("notebooks").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createNotebook(client: Client, userId: string, input: NewNotebookInput): Promise<Notebook> {
  const { data, error } = await client
    .from("notebooks")
    .insert(toNotebookInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNotebook(client: Client, notebookId: string): Promise<void> {
  const { error } = await client.from("notebooks").delete().eq("id", notebookId);
  if (error) throw error;
}

export async function listTopics(client: Client, notebookId: string): Promise<Topic[]> {
  const { data, error } = await client
    .from("topics")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTopic(
  client: Client,
  notebookId: string,
  title: string,
  parentTopicId?: string,
): Promise<Topic> {
  const { data, error } = await client
    .from("topics")
    .insert({ notebook_id: notebookId, title, parent_topic_id: parentTopicId ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listSummaries(client: Client, notebookId: string): Promise<Summary[]> {
  const { data, error } = await client
    .from("summaries")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSummary(
  client: Client,
  notebookId: string,
  input: { title: string; content: string; topicId?: string },
): Promise<Summary> {
  const { data, error } = await client
    .from("summaries")
    .insert({
      notebook_id: notebookId,
      title: input.title,
      content: input.content,
      topic_id: input.topicId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listFlashcards(client: Client, notebookId: string): Promise<Flashcard[]> {
  const { data, error } = await client
    .from("flashcards")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("next_review_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFlashcard(
  client: Client,
  notebookId: string,
  input: NewFlashcardInput,
): Promise<Flashcard> {
  const { data, error } = await client
    .from("flashcards")
    .insert(toFlashcardInsert(notebookId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Registra a revisão no histórico e atualiza o estado do flashcard com o resultado do
 * algoritmo de repetição espaçada (`computeNextReview`, isolado em service.ts).
 */
export async function reviewFlashcard(
  client: Client,
  flashcard: Flashcard,
  grade: FlashcardReviewGrade,
): Promise<Flashcard> {
  const result = computeNextReview(flashcard, grade);

  const { error: reviewError } = await client
    .from("flashcard_reviews")
    .insert({ flashcard_id: flashcard.id, grade });
  if (reviewError) throw reviewError;

  const { data, error } = await client
    .from("flashcards")
    .update({
      interval_days: result.intervalDays,
      ease_factor: result.easeFactor,
      repetitions: result.repetitions,
      next_review_date: result.nextReviewDate,
    })
    .eq("id", flashcard.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listErrorsDoubts(client: Client, notebookId: string): Promise<ErrorDoubt[]> {
  const { data, error } = await client
    .from("errors_doubts")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createErrorDoubt(
  client: Client,
  notebookId: string,
  description: string,
): Promise<ErrorDoubt> {
  const { data, error } = await client
    .from("errors_doubts")
    .insert({ notebook_id: notebookId, description })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function resolveErrorDoubt(client: Client, id: string, isResolved: boolean): Promise<ErrorDoubt> {
  const { data, error } = await client
    .from("errors_doubts")
    .update({ is_resolved: isResolved })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAssessments(client: Client, notebookId: string): Promise<Assessment[]> {
  const { data, error } = await client
    .from("assessments")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("assessment_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createAssessment(
  client: Client,
  notebookId: string,
  input: { name: string; assessmentDate?: string },
): Promise<Assessment> {
  const { data, error } = await client
    .from("assessments")
    .insert({ notebook_id: notebookId, name: input.name, assessment_date: input.assessmentDate ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createStudySession(
  client: Client,
  notebookId: string,
  input: { note?: string; durationMinutes?: number },
): Promise<StudySession> {
  const { data, error } = await client
    .from("study_sessions")
    .insert({ notebook_id: notebookId, note: input.note ?? null, duration_minutes: input.durationMinutes ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listQuizzes(client: Client, notebookId: string): Promise<Quiz[]> {
  const { data, error } = await client
    .from("quizzes")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listQuizQuestions(client: Client, quizId: string): Promise<QuizQuestion[]> {
  const { data, error } = await client
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Cria o quiz e as `QUIZ_QUESTION_COUNT` perguntas juntas — quem chama já validou o formato via
 * `parseGeneratedQuiz()` (service.ts), então aqui é só persistir. Nunca criado sem perguntas.
 */
export async function createQuiz(
  client: Client,
  notebookId: string,
  title: string,
  questions: GeneratedQuizQuestion[],
): Promise<Quiz> {
  const { data: quiz, error: quizError } = await client
    .from("quizzes")
    .insert({ notebook_id: notebookId, title })
    .select("*")
    .single();
  if (quizError) throw quizError;

  const { error: questionsError } = await client.from("quiz_questions").insert(
    questions.map((question, index) => ({
      quiz_id: quiz.id,
      question_text: question.questionText,
      options: question.options,
      correct_option_index: question.correctOptionIndex,
      order_index: index,
    })),
  );
  if (questionsError) throw questionsError;

  return quiz;
}

export async function listQuizAttempts(client: Client, quizId: string): Promise<QuizAttempt[]> {
  const { data, error } = await client
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quizId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Cada tentativa de quiz premia XP — inclusive repetir o mesmo quiz, é engajamento real (docs/decisions/gamification-core-design.md). */
export async function createQuizAttempt(
  client: Client,
  userId: string,
  quizId: string,
  answers: number[],
  score: number,
): Promise<QuizAttempt> {
  const { data, error } = await client
    .from("quiz_attempts")
    .insert({ quiz_id: quizId, user_id: userId, answers, score })
    .select("*")
    .single();
  if (error) throw error;

  await awardXp(client, userId, "quiz_completed");

  return data;
}

/** Flashcards com revisão vencida (hoje ou antes) em todos os cadernos do usuário. */
export async function listDueFlashcards(client: Client, today: string): Promise<Flashcard[]> {
  const { data, error } = await client.from("flashcards").select("*").lte("next_review_date", today);
  if (error) throw error;
  return data;
}

/** Avaliações futuras dentro de N dias, em todos os cadernos do usuário. */
export async function listUpcomingAssessments(client: Client, fromDate: string, toDate: string): Promise<Assessment[]> {
  const { data, error } = await client
    .from("assessments")
    .select("*")
    .gte("assessment_date", fromDate)
    .lte("assessment_date", toDate);
  if (error) throw error;
  return data;
}

/**
 * "Avaliações podem gerar eventos derivados... Agenda organiza o tempo sem duplicar propriedade
 * de provas." Idempotente: se já existir um evento para esta avaliação, retorna ele em vez de
 * criar outro. Chama a API pública de `@qqorvex/module-agenda`, nunca o Supabase por fora dela.
 */
export async function createEventForAssessment(client: Client, userId: string, assessment: Assessment): Promise<CalendarEvent> {
  if (!assessment.assessment_date) {
    throw new Error("Esta avaliação não tem data definida.");
  }
  const existing = await listEventsByAssessment(client, assessment.id);
  if (existing.length > 0) return existing[0]!;

  return createAgendaEvent(client, userId, {
    title: `Avaliação: ${assessment.name}`,
    isAllDay: true,
    startAt: `${assessment.assessment_date}T00:00:00`,
    endAt: `${assessment.assessment_date}T23:59:59`,
    category: "prazo",
    assessmentId: assessment.id,
  });
}

/**
 * "Ação Estudar ou Usar em um Caderno relaciona Item de Biblioteca a Caderno existente ou novo.
 * Biblioteca continua dona do item... Um item pode ser usado por vários Cadernos."
 */
export async function relateLibraryItem(client: Client, notebookId: string, libraryItemId: string): Promise<void> {
  const { error } = await client.from("notebook_library_items").insert({ notebook_id: notebookId, library_item_id: libraryItemId });
  if (error) throw error;
}

export async function unrelateLibraryItem(client: Client, notebookId: string, libraryItemId: string): Promise<void> {
  const { error } = await client
    .from("notebook_library_items")
    .delete()
    .eq("notebook_id", notebookId)
    .eq("library_item_id", libraryItemId);
  if (error) throw error;
}

export async function listRelatedLibraryItems(client: Client, notebookId: string): Promise<LibraryItem[]> {
  const { data: relations, error: relationsError } = await client
    .from("notebook_library_items")
    .select("library_item_id")
    .eq("notebook_id", notebookId);
  if (relationsError) throw relationsError;
  if (relations.length === 0) return [];

  const { data, error } = await client
    .from("library_items")
    .select("*")
    .in("id", relations.map((r) => r.library_item_id));
  if (error) throw error;
  return data;
}
