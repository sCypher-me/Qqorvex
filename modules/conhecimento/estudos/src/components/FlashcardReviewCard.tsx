import { useState } from "react";
import { Button, Card } from "@qqorvex/ui";
import type { Flashcard, FlashcardReviewGrade } from "../types";

const GRADE_OPTIONS: { grade: FlashcardReviewGrade; label: string }[] = [
  { grade: "errei", label: "Errei" },
  { grade: "dificil", label: "Difícil" },
  { grade: "bom", label: "Bom" },
  { grade: "facil", label: "Fácil" },
];

export function FlashcardReviewCard({
  flashcard,
  onGrade,
}: {
  flashcard: Flashcard;
  onGrade: (grade: FlashcardReviewGrade) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Card variant="tile" flush className="p-4">
      <p className="text-sm font-medium leading-relaxed text-text-primary">{flashcard.front}</p>

      {revealed ? (
        <>
          <p className="qv-row-top pt-3 text-sm leading-relaxed text-text-secondary">{flashcard.back}</p>
          <div className="flex gap-1.5 flex-wrap">
            {GRADE_OPTIONS.map((option) => (
              <Button
                key={option.grade}
                type="button"
                variant="quiet"
                size="xs"
                onClick={() => {
                  onGrade(option.grade);
                  setRevealed(false);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <Button type="button" variant="secondary" size="xs" className="self-start" onClick={() => setRevealed(true)}>
          Mostrar resposta
        </Button>
      )}
    </Card>
  );
}
