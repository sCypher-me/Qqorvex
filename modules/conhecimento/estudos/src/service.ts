import type { Flashcard, FlashcardReviewGrade, QuizQuestion, Topic } from "./types";

/**
 * "Manter hierarquia simples/limitada" para tópicos — mesmo teto de profundidade usado em
 * Metas (principal + subtópico), validado em TS, não no banco.
 */
export function canBeSubTopic(candidateParent: Topic | undefined): boolean {
  if (!candidateParent) return false;
  return candidateParent.parent_topic_id === null;
}

export interface SpacedRepetitionResult {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
}

const MIN_EASE_FACTOR = 1.3;
const EASE_DELTA: Record<FlashcardReviewGrade, number> = {
  errei: -0.2,
  dificil: -0.15,
  bom: 0,
  facil: 0.15,
};

/**
 * "O algoritmo exato permanece pendente e deve ser substituível sem perder conteúdo/histórico."
 * Implementação atual: variante simplificada do SM-2. Trocar por outro algoritmo exige só
 * reescrever esta função — o schema (interval_days/ease_factor/repetitions/next_review_date)
 * e o histórico em flashcard_reviews não mudam.
 */
export function computeNextReview(
  flashcard: Pick<Flashcard, "interval_days" | "ease_factor" | "repetitions">,
  grade: FlashcardReviewGrade,
  today: Date = new Date(),
): SpacedRepetitionResult {
  const easeFactor = Math.max(MIN_EASE_FACTOR, flashcard.ease_factor + EASE_DELTA[grade]);

  let repetitions: number;
  let intervalDays: number;

  if (grade === "errei") {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = flashcard.repetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(flashcard.interval_days * easeFactor);
  }

  const nextReviewDate = new Date(today);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    intervalDays,
    easeFactor,
    repetitions,
    nextReviewDate: nextReviewDate.toISOString().slice(0, 10),
  };
}

export const QUIZ_QUESTION_COUNT = 5;

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

function isValidGeneratedQuestion(value: unknown): value is GeneratedQuizQuestion {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.questionText === "string" &&
    candidate.questionText.trim().length > 0 &&
    Array.isArray(candidate.options) &&
    candidate.options.length === 4 &&
    candidate.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    typeof candidate.correctOptionIndex === "number" &&
    Number.isInteger(candidate.correctOptionIndex) &&
    candidate.correctOptionIndex >= 0 &&
    candidate.correctOptionIndex <= 3
  );
}

/**
 * Valida o JSON cru que o provider devolveu ao gerar um quiz — nunca confia cegamente num LLM
 * local pequeno. Aceita tanto um array puro quanto `{ questions: [...] }` (modelos variam no
 * envelope). Retorna `null` para qualquer formato inesperado, incompleto ou com menos/mais que
 * `QUIZ_QUESTION_COUNT` perguntas — quem chama decide como recusar sem persistir nada.
 */
export function parseGeneratedQuiz(raw: string): GeneratedQuizQuestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const questions = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).questions)
      ? (parsed as Record<string, unknown>).questions
      : null;

  if (!Array.isArray(questions) || questions.length !== QUIZ_QUESTION_COUNT) return null;
  if (!questions.every(isValidGeneratedQuestion)) return null;
  return questions;
}

/** Compara as respostas escolhidas (mesma ordem das perguntas) com o gabarito e retorna nº de acertos. */
export function computeQuizScore(questions: Pick<QuizQuestion, "correct_option_index">[], answers: number[]): number {
  return questions.reduce((score, question, index) => (answers[index] === question.correct_option_index ? score + 1 : score), 0);
}
