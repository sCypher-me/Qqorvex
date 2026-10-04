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

/** Formata uma data pelo calendário local, sem deslocar o dia via UTC. */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
    nextReviewDate: getLocalDateKey(nextReviewDate),
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
  const parsed = parseJsonLoosely(raw);
  const questions = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).questions)
      ? ((parsed as Record<string, unknown>).questions as unknown[])
      : null;
  if (!questions) return null;

  // Modelos às vezes mandam uma pergunta a mais ou uma malformada: aproveita as válidas, mas só
  // grava o quiz se sobrarem perguntas suficientes.
  const valid = questions.filter(isValidGeneratedQuestion).map((question) => ({
    questionText: question.questionText.trim(),
    options: question.options.map((option) => option.trim()),
    correctOptionIndex: question.correctOptionIndex,
  }));
  return valid.length >= QUIZ_QUESTION_COUNT ? valid.slice(0, QUIZ_QUESTION_COUNT) : null;
}

/** JSON puro, dentro de bloco ```json``` ou com texto antes/depois (o primeiro objeto/lista vale). */
function parseJsonLoosely(raw: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const text = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/** Compara as respostas escolhidas (mesma ordem das perguntas) com o gabarito e retorna nº de acertos. */
export function computeQuizScore(questions: Pick<QuizQuestion, "correct_option_index">[], answers: number[]): number {
  return questions.reduce((score, question, index) => (answers[index] === question.correct_option_index ? score + 1 : score), 0);
}
