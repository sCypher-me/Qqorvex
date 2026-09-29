import { useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { Button, ProgressBar, cx } from "@qqorvex/ui";
import { computeQuizScore } from "../service";
import type { QuizQuestion } from "../types";

/** `options` é jsonb, gravado como `string[]` por `createQuiz()`. */
function optionsOf(question: QuizQuestion): string[] {
  return Array.isArray(question.options) ? (question.options as string[]) : [];
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Quiz uma pergunta por vez; no fim mostra a nota e a correção de cada pergunta. A tentativa é
 * registrada ao corrigir (`onSubmit`).
 */
export function QuizTakingForm({ questions, onSubmit, onClose }: { questions: QuizQuestion[]; onSubmit: (result: { answers: number[]; score: number }) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<{ answers: number[]; score: number } | null>(null);
  const question = questions[step];
  const answered = answers[step] !== undefined && answers[step]! >= 0;
  const isLast = step === questions.length - 1;

  function finish() {
    const score = computeQuizScore(questions, answers);
    const next = { answers, score };
    setResult(next);
    onSubmit(next);
  }

  if (result) {
    const pct = Math.round((result.score / questions.length) * 100);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 rounded-xl border border-line bg-canvas/40 p-4">
          <span className={cx("font-display text-[32px] font-semibold tabular-nums", pct >= 70 ? "text-success" : pct >= 40 ? "text-warning" : "text-danger")}>
            {result.score}/{questions.length}
          </span>
          <div>
            <p className="text-[14px] font-medium text-fg">{pct >= 90 ? "Excelente!" : pct >= 70 ? "Muito bem." : pct >= 40 ? "Quase lá." : "Vale revisar este conteúdo."}</p>
            <p className="text-xs text-fg-3">{pct}% de acerto · a tentativa foi registrada</p>
          </div>
        </div>
        <ol className="flex flex-col gap-3">
          {questions.map((item, index) => {
            const chosen = result.answers[index] ?? -1;
            const correct = chosen === item.correct_option_index;
            return (
              <li key={item.id} className="rounded-lg border border-line-soft px-4 py-3">
                <p className="flex gap-2 text-[13.5px] font-medium text-fg">
                  {correct ? <CheckCircleIcon size={18} weight="fill" className="mt-px shrink-0 text-success" /> : <XCircleIcon size={18} weight="fill" className="mt-px shrink-0 text-danger" />}
                  {item.question_text}
                </p>
                {!correct && (
                  <p className="mt-1.5 pl-[26px] text-xs text-fg-3">
                    {chosen >= 0 && (
                      <>
                        Sua resposta: <span className="text-danger">{optionsOf(item)[chosen]}</span> ·{" "}
                      </>
                    )}
                    Correta: <span className="text-success">{optionsOf(item)[item.correct_option_index]}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-fg-3 tabular-nums">
          {step + 1} de {questions.length}
        </span>
        <ProgressBar value={((step + (answered ? 1 : 0)) / questions.length) * 100} height={4} label="Progresso do quiz" className="flex-1" />
      </div>
      <p className="font-display text-[18px] font-semibold leading-snug text-fg">{question.question_text}</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Alternativas">
        {optionsOf(question).map((option, optionIndex) => {
          const chosen = answers[step] === optionIndex;
          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => setAnswers((current) => current.map((value, index) => (index === step ? optionIndex : value)))}
              className={cx(
                "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-[14px] transition-colors",
                chosen ? "border-gold-line bg-gold-soft text-fg" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg",
              )}
            >
              <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold", chosen ? "bg-gold text-on-gold" : "bg-hover text-fg-3")}>{LETTERS[optionIndex]}</span>
              <span className="pt-0.5">{option}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-4">
        <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep((current) => current - 1)}>
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={answers.some((value) => value < 0)}>
            Corrigir
          </Button>
        ) : (
          <Button onClick={() => setStep((current) => current + 1)} disabled={!answered}>
            Próxima
          </Button>
        )}
      </div>
    </div>
  );
}
