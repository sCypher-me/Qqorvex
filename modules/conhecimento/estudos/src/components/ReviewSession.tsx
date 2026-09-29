import { useCallback, useEffect, useMemo, useState } from "react";
import { CardsThreeIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Button, Kbd, Modal, ProgressBar, cx } from "@qqorvex/ui";
import { computeNextReview } from "../service";
import type { Flashcard, FlashcardReviewGrade } from "../types";

const GRADES: Array<{ grade: FlashcardReviewGrade; label: string; key: string; className: string }> = [
  { grade: "errei", label: "Errei", key: "1", className: "border-danger/35 text-danger hover:bg-danger-soft" },
  { grade: "dificil", label: "Difícil", key: "2", className: "border-warning/35 text-warning hover:bg-warning-soft" },
  { grade: "bom", label: "Bom", key: "3", className: "border-success/35 text-success hover:bg-success-soft" },
  { grade: "facil", label: "Fácil", key: "4", className: "border-info/35 text-info hover:bg-info-soft" },
];

export function formatInterval(days: number): string {
  if (days <= 1) return "amanhã";
  if (days < 30) return `${days} dias`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 mês" : `${months} meses`;
  const years = Math.round(days / 365);
  return years === 1 ? "1 ano" : `${years} anos`;
}

interface ReviewSessionProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  /** Nome do caderno de cada cartão (sessão com vários cadernos). */
  notebookName?: (notebookId: string) => string | undefined;
  onGrade: (card: Flashcard, grade: FlashcardReviewGrade) => Promise<Flashcard>;
}

/**
 * Sessão de revisão espaçada: mostra a frente, revela o verso e a pessoa avalia de 1 a 4.
 * Cartões errados voltam uma vez no fim da sessão. Atalhos: espaço revela, 1–4 avaliam.
 */
export function ReviewSession({ isOpen, onClose, cards, notebookName, onGrade }: ReviewSessionProps) {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [results, setResults] = useState<Record<FlashcardReviewGrade, number>>({ errei: 0, dificil: 0, bom: 0, facil: 0 });
  const [requeued, setRequeued] = useState<Set<string>>(new Set());

  // Congela a fila ao abrir: invalidações durante a sessão não reembaralham os cartões.
  useEffect(() => {
    if (!isOpen) return;
    setQueue(cards);
    setIndex(0);
    setRevealed(false);
    setFailed(false);
    setResults({ errei: 0, dificil: 0, bom: 0, facil: 0 });
    setRequeued(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const card = queue[index];
  const done = isOpen && queue.length > 0 && index >= queue.length;
  const reviewed = Object.values(results).reduce((sum, value) => sum + value, 0);

  const grade = useCallback(
    async (value: FlashcardReviewGrade) => {
      if (!card || !revealed || saving) return;
      setSaving(true);
      setFailed(false);
      try {
        const updated = await onGrade(card, value);
        setResults((current) => ({ ...current, [value]: current[value] + 1 }));
        if (value === "errei" && !requeued.has(card.id)) {
          setQueue((current) => [...current, updated]);
          setRequeued((current) => new Set(current).add(card.id));
        }
        setIndex((current) => current + 1);
        setRevealed(false);
      } catch {
        setFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [card, onGrade, requeued, revealed, saving],
  );

  useEffect(() => {
    if (!isOpen || done) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if ((event.key === " " || event.key === "Enter") && !revealed) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      const match = GRADES.find((entry) => entry.key === event.key);
      if (match && revealed) {
        event.preventDefault();
        void grade(match.grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, grade, isOpen, revealed]);

  const hints = useMemo(() => (card ? Object.fromEntries(GRADES.map((entry) => [entry.grade, formatInterval(computeNextReview(card, entry.grade).intervalDays)])) : {}), [card]);
  const source = card && notebookName?.(card.notebook_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<CardsThreeIcon />}
      title="Revisão"
      description={done ? "Sessão concluída" : queue.length ? `Cartão ${Math.min(index + 1, queue.length)} de ${queue.length}${source ? ` · ${source}` : ""}` : "Nada para revisar"}
    >
      {queue.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-fg-3">Nenhum cartão vencido. Volte amanhã ou crie novos cartões.</p>
      ) : done ? (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon size={26} weight="fill" />
          </span>
          <div>
            <p className="font-display text-[22px] font-semibold text-fg">Revisão concluída</p>
            <p className="mt-1 text-[14px] text-fg-3">
              {reviewed} {reviewed === 1 ? "avaliação" : "avaliações"} registradas. Os próximos lembretes já foram agendados.
            </p>
          </div>
          <dl className="grid w-full max-w-sm grid-cols-4 gap-2">
            {GRADES.map((entry) => (
              <div key={entry.grade} className="rounded-lg border border-line bg-canvas/40 px-2 py-2.5">
                <dt className="text-[11px] text-fg-3">{entry.label}</dt>
                <dd className="mt-0.5 font-display text-[18px] font-semibold tabular-nums text-fg">{results[entry.grade]}</dd>
              </div>
            ))}
          </dl>
          <Button onClick={onClose}>Concluir</Button>
        </div>
      ) : card ? (
        <div className="flex flex-col gap-4">
          <ProgressBar value={(index / queue.length) * 100} height={4} label="Progresso da revisão" />
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={revealed}
            className="flex min-h-[240px] flex-col items-stretch justify-center rounded-xl border border-line bg-canvas/40 px-6 py-8 text-center transition-colors enabled:hover:border-line-strong"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Pergunta</span>
            <span className="mt-2 whitespace-pre-wrap font-display text-[20px] font-semibold leading-snug text-fg sm:text-[22px]">{card.front}</span>
            {revealed ? (
              <span className="mt-6 border-t border-line pt-5 animate-fade-in">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-fg-4">Resposta</span>
                <span className="mt-2 block whitespace-pre-wrap text-[16px] leading-relaxed text-fg-2">{card.back}</span>
              </span>
            ) : (
              <span className="mt-6 text-[13px] text-fg-3">
                Clique ou tecle <Kbd>Espaço</Kbd> para ver a resposta
              </span>
            )}
          </button>
          {failed && <p role="alert" className="text-center text-xs text-danger">Não foi possível salvar esta avaliação. Tente de novo.</p>}
          <div className={cx("grid grid-cols-2 gap-2 sm:grid-cols-4", !revealed && "pointer-events-none opacity-40")} aria-hidden={!revealed}>
            {GRADES.map((entry) => (
              <button
                key={entry.grade}
                type="button"
                disabled={!revealed || saving}
                onClick={() => void grade(entry.grade)}
                className={cx("flex flex-col items-center gap-0.5 rounded-lg border bg-surface px-3 py-2.5 transition-colors disabled:cursor-not-allowed", entry.className)}
              >
                <span className="text-[14px] font-semibold">{entry.label}</span>
                <span className="text-[11px] text-fg-3">
                  {hints[entry.grade]} · <kbd className="font-mono">{entry.key}</kbd>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
