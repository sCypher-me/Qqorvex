import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import type { LibraryItem } from "../types";

type ReviewInput = { rating: number | null; shortNote: string | null };

export function ItemReviewForm({ item, isSaving, onSave }: { item: LibraryItem; isSaving: boolean; onSave: (review: ReviewInput) => Promise<unknown> }) {
  const [rating, setRating] = useState<number | null>(item.rating);
  const [note, setNote] = useState(item.short_note ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setRating(item.rating);
    setNote(item.short_note ?? "");
    setError("");
  }, [item.id, item.rating, item.short_note]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await onSave({ rating, shortNote: note.trim() || null });
    } catch {
      setError("Não foi possível salvar sua avaliação. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="qv-well flex flex-col gap-3 p-4">
      <div>
        <h3 className="m-0 text-sm font-semibold text-text-primary">Sua avaliação</h3>
        <p className="m-0 mt-1 text-xs text-text-muted">Guarde uma nota pessoal para lembrar o que achou.</p>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Avaliação de uma a cinco estrelas">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} de 5 estrelas`} aria-pressed={rating === value} onClick={() => setRating(value)} className={`rounded-md px-1.5 py-1 text-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-vex-cyan-bright ${rating !== null && value <= rating ? "text-vex-gold-bright" : "text-text-muted hover:text-vex-gold"}`}>★</button>)}
        {rating !== null && <button type="button" onClick={() => setRating(null)} className="ml-2 text-xs text-text-muted underline underline-offset-2">Limpar</button>}
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-text-secondary">Nota privada
        <textarea value={note} maxLength={500} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="O que você quer lembrar sobre este item?" className="qv-field resize-y text-sm" />
      </label>
      {error && <span role="alert" className="text-xs text-error">{error}</span>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>{isSaving ? "Salvando…" : "Salvar avaliação"}</Button>
      </div>
    </form>
  );
}
