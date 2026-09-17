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
    <div className="qv-well p-4 flex flex-col gap-5">
      {questions.map((question, index) => (
        <div key={question.id} className="flex flex-col gap-2.5">
          <p className="text-sm font-medium leading-relaxed text-text-primary">
            <span className="font-mono text-text-muted mr-1.5">{index + 1}.</span>
            {question.question_text}
          </p>
          <div className="flex flex-col gap-1.5">
            {optionsOf(question).map((option, optionIndex) => {
              const isChosen = answers[question.id] === optionIndex;
              const isCorrectOption = optionIndex === question.correct_option_index;
              const showFeedback = corrected !== null;
              return (
                <label
                  key={optionIndex}
                  className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-[10px] border cursor-pointer transition-colors ${
                    showFeedback && isCorrectOption
                      ? "border-success-border bg-success-bg text-success"
                      : showFeedback && isChosen
                        ? "border-error-border bg-error-bg text-error"
                        : isChosen
                          ? "border-vex-cyan-dark bg-[rgba(67,185,210,.08)] text-text-primary"
                          : "border-border text-text-secondary hover:text-text-primary hover:border-text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={isChosen}
                    disabled={corrected !== null}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                    className="accent-[var(--color-vex-cyan)]"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {corrected ? (
        <div className="qv-row-top pt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-text-primary">
            Resultado:{" "}
            <span className="font-mono">
              {corrected.score}/{questions.length}
            </span>{" "}
            corretas
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="qv-row-top pt-4 flex gap-2.5">
          <Button type="button" variant="primary" size="sm" onClick={handleCorrect} disabled={!allAnswered}>
            Corrigir
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
