import { useState } from "react";
import { Button } from "@qqorvex/ui";
import { computeQuizScore } from "../service";
import type { QuizQuestion } from "../types";

/**
 * `options` é jsonb no banco — persistido como `string[]` por `createQuiz()`, então o cast aqui é
 * seguro (não vem de nenhuma outra origem).
 */
function optionsOf(question: QuizQuestion): string[] {
  return question.options as string[];
}

export function QuizTakingForm({
  questions,
  onSubmit,
  onClose,
}: {
  questions: QuizQuestion[];
  onSubmit: (result: { answers: number[]; score: number }) => void;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [corrected, setCorrected] = useState<{ answers: number[]; score: number } | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  function handleCorrect() {
    const orderedAnswers = questions.map((q) => answers[q.id]!);
    const score = computeQuizScore(questions, orderedAnswers);
    const result = { answers: orderedAnswers, score };
    setCorrected(result);
    onSubmit(result);
  }

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4 flex flex-col gap-4">
      {questions.map((question, index) => (
        <div key={question.id} className="flex flex-col gap-2">
          <p className="font-sans text-sm text-text-primary">
            {index + 1}. {question.question_text}
          </p>
          <div className="flex flex-col gap-1">
            {optionsOf(question).map((option, optionIndex) => {
              const isChosen = answers[question.id] === optionIndex;
              const isCorrectOption = optionIndex === question.correct_option_index;
              const showFeedback = corrected !== null;
              return (
                <label
                  key={optionIndex}
                  className={`flex items-center gap-2 text-sm font-sans px-2 py-1 rounded-md border ${
                    showFeedback && isCorrectOption
                      ? "border-success-border bg-success-bg text-success"
                      : showFeedback && isChosen
                        ? "border-error-border bg-error-bg text-error"
                        : "border-border text-text-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={isChosen}
                    disabled={corrected !== null}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {corrected ? (
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-text-primary">
            Resultado: {corrected.score} de {questions.length} corretas.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleCorrect} disabled={!allAnswered}>
            Corrigir
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
