import type { SupabaseClient, Database } from "@qqorvex/database";
import { createEvent as createAgendaEvent, listEventsByAssessment, updateEvent as updateAgendaEvent, type CalendarEvent } from "@qqorvex/module-agenda";
import type { LibraryItem } from "@qqorvex/module-biblioteca";
import { awardXp, recordHighAccuracyQuiz } from "@qqorvex/module-gamificacao";
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

export async function updateNotebook(
  client: Client,
  notebookId: string,
  input: Partial<NewNotebookInput> & { status?: Notebook["status"]; isFavorite?: boolean },
): Promise<Notebook> {
  const update = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.notebookType !== undefined ? { notebook_type: input.notebookType } : {}),
    ...(input.area !== undefined ? { area: input.area || null } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.description !== undefined ? { description: input.description || null } : {}),
    ...(input.institution !== undefined ? { institution: input.institution || null } : {}),
    ...(input.instructor !== undefined ? { instructor: input.instructor || null } : {}),
    ...(input.startDate !== undefined ? { start_date: input.startDate || null } : {}),
    ...(input.endDate !== undefined ? { end_date: input.endDate || null } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.isFavorite !== undefined ? { is_favorite: input.isFavorite } : {}),
  };
  const { data, error } = await client.from("notebooks").update(update).eq("id", notebookId).select("*").single();
  if (error) throw error;
  return data;
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
    .order("updated_at", { ascending: false });
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

export async function updateSummary(
  client: Client,
  summaryId: string,
  input: { title: string; content: string; topicId?: string | null },
): Promise<Summary> {
  const { data, error } = await client
    .from("summaries")
    .update({
      title: input.title,
      content: input.content,
      topic_id: input.topicId ?? null,
    })
    .eq("id", summaryId)
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

export async function updateErrorDoubt(client: Client, id: string, description: string): Promise<ErrorDoubt> {
  const { data, error } = await client.from("errors_doubts").update({ description }).eq("id", id).select("*").single();
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
  input: { name: string; assessmentDate?: string; expectedContent?: string },
): Promise<Assessment> {
  const { data, error } = await client
    .from("assessments")
    .insert({ notebook_id: notebookId, name: input.name, assessment_date: input.assessmentDate ?? null, expected_content: input.expectedContent ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Edita a avaliação e mantém o evento dela na Agenda (criado por `createEventForAssessment`) com a
 * mesma data. O título do evento só acompanha o novo nome se ainda for o automático
 * ("Avaliação: <nome antigo>") — um título escrito pela pessoa na Agenda é preservado. Sem data,
 * o evento fica como está; sem mudança de nome/data, o evento nem é consultado (evita reenviar ao
 * Google Calendar à toa).
 */
export async function updateAssessment(
  client: Client,
  assessmentId: string,
  input: { name: string; assessmentDate?: string; expectedContent?: string },
): Promise<Assessment> {
  const { data: before, error: beforeError } = await client.from("assessments").select("name, assessment_date").eq("id", assessmentId).single();
  if (beforeError) throw beforeError;

  const { data, error } = await client
    .from("assessments")
    .update({ name: input.name, assessment_date: input.assessmentDate ?? null, expected_content: input.expectedContent ?? null })
    .eq("id", assessmentId)
    .select("*")
    .single();
  if (error) throw error;

  const date = data.assessment_date;
  if (!date || (before.name === data.name && before.assessment_date === date)) return data;

  const oldAutoTitle = `Avaliação: ${before.name}`;
  for (const event of await listEventsByAssessment(client, assessmentId)) {
    await updateAgendaEvent(client, event.id, {
      title: event.title === oldAutoTitle ? `Avaliação: ${data.name}` : event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      meetingLink: event.meeting_link ?? undefined,
      category: event.category,
      isAllDay: true,
      startAt: `${date}T00:00:00`,
      endAt: `${date}T23:59:59`,
    });
  }
  return data;
}

export async function createStudySession(
  client: Client,
  notebookId: string,
  input: { note?: string; durationMinutes?: number; occurredAt?: string },
): Promise<StudySession> {
  const { data, error } = await client
    .from("study_sessions")
    .insert({ notebook_id: notebookId, note: input.note ?? null, duration_minutes: input.durationMinutes ?? null, ...(input.occurredAt ? { occurred_at: input.occurredAt } : {}) })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listStudySessions(client: Client, notebookId: string): Promise<StudySession[]> {
  const { data, error } = await client
    .from("study_sessions")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("occurred_at", { ascending: false });
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
  if (answers.length > 0 && score / answers.length >= 0.9) {
    await recordHighAccuracyQuiz(client, userId);
  }

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

export async function deleteSummary(client: Client, summaryId: string): Promise<void> {
  const { error } = await client.from("summaries").delete().eq("id", summaryId);
  if (error) throw error;
}

export async function updateFlashcard(client: Client, flashcardId: string, input: { front: string; back: string }): Promise<Flashcard> {
  const { data, error } = await client.from("flashcards").update({ front: input.front, back: input.back }).eq("id", flashcardId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteFlashcard(client: Client, flashcardId: string): Promise<void> {
  const { error } = await client.from("flashcards").delete().eq("id", flashcardId);
  if (error) throw error;
}

export async function updateTopic(client: Client, topicId: string, title: string): Promise<Topic> {
  const { data, error } = await client.from("topics").update({ title }).eq("id", topicId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTopic(client: Client, topicId: string): Promise<void> {
  const { error } = await client.from("topics").delete().eq("id", topicId);
  if (error) throw error;
}

export async function deleteErrorDoubt(client: Client, id: string): Promise<void> {
  const { error } = await client.from("errors_doubts").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAssessment(client: Client, assessmentId: string): Promise<void> {
  const { error } = await client.from("assessments").delete().eq("id", assessmentId);
  if (error) throw error;
}

export async function deleteStudySession(client: Client, sessionId: string): Promise<void> {
  const { error } = await client.from("study_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export interface NotebookStats {
  summaries: number;
  flashcards: number;
  due: number;
}

/**
 * Contagens por caderno em duas consultas leves (só ids), para os cartões da lista não fazerem
 * uma consulta por caderno.
 */
export async function listNotebookStats(client: Client, today: string): Promise<Record<string, NotebookStats>> {
  const [summaries, flashcards] = await Promise.all([
    client.from("summaries").select("notebook_id"),
    client.from("flashcards").select("notebook_id, next_review_date"),
  ]);
  if (summaries.error) throw summaries.error;
  if (flashcards.error) throw flashcards.error;
  const stats: Record<string, NotebookStats> = {};
  const entry = (id: string) => (stats[id] ??= { summaries: 0, flashcards: 0, due: 0 });
  for (const row of summaries.data) entry(row.notebook_id).summaries += 1;
  for (const row of flashcards.data) {
    const current = entry(row.notebook_id);
    current.flashcards += 1;
    if (row.next_review_date <= today) current.due += 1;
  }
  return stats;
}

/** Sessões de estudo de todos os cadernos a partir de uma data (ISO), para o resumo da semana. */
export async function listStudySessionsSince(client: Client, fromIso: string): Promise<StudySession[]> {
  const { data, error } = await client.from("study_sessions").select("*").gte("occurred_at", fromIso).order("occurred_at", { ascending: true });
  if (error) throw error;
  return data;
}
