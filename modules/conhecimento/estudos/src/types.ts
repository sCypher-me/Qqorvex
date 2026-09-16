import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Estudos é fonte de verdade dos Cadernos e objetos próprios de aprendizagem: Tópicos, Resumos,
 * Flashcards+Revisão Espaçada, Erros & Dúvidas, Avaliações, Sessões de Estudo e Quiz/Testes
 * (gerados pela Vex a partir dos Resumos — ver docs/decisions/estudos-quiz-design.md). Study
 * Capability Packs por área ainda ficam para depois.
 */
export type Notebook = Tables<"notebooks">;
export type NotebookType = Notebook["notebook_type"];
export type NotebookStatus = Notebook["status"];
export type Topic = Tables<"topics">;
export type Summary = Tables<"summaries">;
export type Flashcard = Tables<"flashcards">;
export type FlashcardReview = Tables<"flashcard_reviews">;
export type FlashcardReviewGrade = FlashcardReview["grade"];
export type ErrorDoubt = Tables<"errors_doubts">;
export type ErrorDoubtKind = ErrorDoubt["kind"];
export type Assessment = Tables<"assessments">;
export type StudySession = Tables<"study_sessions">;
export type Quiz = Tables<"quizzes">;
export type QuizQuestion = Tables<"quiz_questions">;
export type QuizAttempt = Tables<"quiz_attempts">;

export interface NewNotebookInput {
  name: string;
  notebookType?: NotebookType;
  area?: string;
  tags?: string[];
  description?: string;
  institution?: string;
  instructor?: string;
}

export function toNotebookInsert(userId: string, input: NewNotebookInput): TablesInsert<"notebooks"> {
  return {
    user_id: userId,
    name: input.name,
    notebook_type: input.notebookType ?? "outro",
    area: input.area ?? null,
    tags: input.tags ?? [],
    description: input.description ?? null,
    institution: input.institution ?? null,
    instructor: input.instructor ?? null,
  };
}

export interface NewFlashcardInput {
  front: string;
  back: string;
  topicId?: string;
  summaryId?: string;
  tags?: string[];
}

export function toFlashcardInsert(notebookId: string, input: NewFlashcardInput): TablesInsert<"flashcards"> {
  return {
    notebook_id: notebookId,
    front: input.front,
    back: input.back,
    topic_id: input.topicId ?? null,
    summary_id: input.summaryId ?? null,
    tags: input.tags ?? [],
  };
}
