import { useEffect, useState } from "react";
import { StarIcon } from "@phosphor-icons/react";
import { cx } from "@qqorvex/ui";
import type { LibraryItem } from "../types";

type ReviewInput = { rating: number | null; shortNote: string | null };

/** Avaliação de 1 a 5 (salva ao clicar; clicar na mesma estrela limpa) e nota privada (salva ao sair do campo). */
export function ItemReviewForm({ item, isSaving, onSave }: { item: LibraryItem; isSaving: boolean; onSave: (review: ReviewInput) => Promise<unknown> }) {
  const [rating, setRating] = useState<number | null>(item.rating);
  const [hover, setHover] = useState<number | null>(null);
  const [note, setNote] = useState(item.short_note ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setRating(item.rating);
    setNote(item.short_note ?? "");
    setStatus("idle");
  }, [item.id, item.rating, item.short_note]);

  async function save(next: ReviewInput) {
    try {
      await onSave(next);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const shown = hover ?? rating ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Sua avaliação" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} de 5 estrelas`}
            disabled={isSaving}
            onMouseEnter={() => setHover(value)}
            onClick={() => {
              const next = rating === value ? null : value;
              setRating(next);
              void save({ rating: next, shortNote: note.trim() || null });
            }}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[var(--q-focus)]"
          >
            <StarIcon size={24} weight={value <= shown ? "fill" : "regular"} className={cx(value <= shown ? "text-gold-fg" : "text-fg-4")} />
          </button>
        ))}
        <span className="ml-2 text-xs text-fg-3">{rating ? ["", "Não gostei", "Mais ou menos", "Bom", "Muito bom", "Incrível"][rating] : "Sem nota"}</span>
      </div>
      <textarea
        value={note}
        maxLength={500}
        rows={3}
        onChange={(event) => {
          setNote(event.target.value);
          setStatus("idle");
        }}
        onBlur={() => {
          if ((note.trim() || null) !== (item.short_note ?? null)) void save({ rating, shortNote: note.trim() || null });
        }}
        placeholder="O que você quer lembrar sobre isto? (só você vê)"
        aria-label="Nota privada"
        className="q-input min-h-[76px] resize-y py-2 text-[13.5px]"
      />
      <p className={cx("-mt-1 text-[11px]", status === "error" ? "text-danger" : "text-fg-4")} aria-live="polite">
        {status === "error" ? "Não foi possível salvar. Tente de novo." : status === "saved" ? "Salvo" : "Salva ao sair do campo"}
      </p>
    </div>
  );
}
