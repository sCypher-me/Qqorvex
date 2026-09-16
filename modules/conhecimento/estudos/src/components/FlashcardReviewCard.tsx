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
    <Card accent="gold">
      <p className="font-sans text-sm text-text-primary">{flashcard.front}</p>

      {revealed ? (
        <>
          <p className="font-sans text-sm text-brand-cyan border-t border-border pt-3">{flashcard.back}</p>
          <div className="flex gap-1">
            {GRADE_OPTIONS.map((option) => (
              <Button
                key={option.grade}
                type="button"
                variant="chip"
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
        <Button variant="chip-accent" onClick={() => setRevealed(true)}>
          Mostrar resposta
        </Button>
      )}
    </Card>
  );
}
