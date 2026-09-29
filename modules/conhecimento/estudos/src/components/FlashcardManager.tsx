import { useMemo, useRef, useState, type FormEvent } from "react";
import { CardsThreeIcon, DotsThreeIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge, Button, ConfirmDialog, DropdownMenu, EmptyState, Textarea, cx } from "@qqorvex/ui";
import { getLocalDateKey } from "../service";
import type { Flashcard } from "../types";
import { formatInterval } from "./ReviewSession";

function daysBetween(fromKey: string, toKey: string): number {
  const [fy = 0, fm = 1, fd = 1] = fromKey.split("-").map(Number);
  const [ty = 0, tm = 1, td = 1] = toKey.split("-").map(Number);
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000);
}

function FlashcardEditor({ initial, submitLabel, busy, onSubmit, onCancel }: { initial?: { front: string; back: string }; submitLabel: string; busy: boolean; onSubmit: (front: string, back: string) => Promise<unknown>; onCancel?: () => void }) {
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const valid = front.trim().length > 0 && back.trim().length > 0;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!valid || busy) return;
    await onSubmit(front.trim(), back.trim());
    if (!initial) {
      setFront("");
      setBack("");
      frontRef.current?.focus();
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit();
        if (event.key === "Escape" && onCancel) onCancel();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Textarea ref={frontRef} label="Frente" value={front} onChange={(event) => setFront(event.target.value)} placeholder="Pergunta, termo ou conceito" rows={3} autoFocus={Boolean(initial)} />
        <Textarea label="Verso" value={back} onChange={(event) => setBack(event.target.value)} placeholder="Resposta ou explicação" rows={3} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto hidden text-xs text-fg-4 sm:block">Ctrl + Enter salva</span>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!valid} loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export interface FlashcardManagerProps {
  flashcards: Flashcard[];
  onCreate: (front: string, back: string) => Promise<unknown>;
  onUpdate: (flashcardId: string, front: string, back: string) => Promise<unknown>;
  onDelete: (flashcardId: string) => void;
  creating: boolean;
  updating: boolean;
}

/** Cartões do caderno: criar, editar, excluir e ver quando cada um volta para revisão. */
export function FlashcardManager({ flashcards, onCreate, onUpdate, onDelete, creating, updating }: FlashcardManagerProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Flashcard | null>(null);
  const today = getLocalDateKey();

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return flashcards.filter((card) => !term || `${card.front} ${card.back}`.toLowerCase().includes(term));
  }, [flashcards, query]);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="mb-3 text-[14px] font-semibold text-fg">Novo cartão</h3>
        <FlashcardEditor submitLabel="Adicionar cartão" busy={creating} onSubmit={onCreate} />
      </section>

      {flashcards.length === 0 ? (
        <EmptyState icon={<CardsThreeIcon />} title="Nenhum cartão ainda" description="Transforme o que você precisa lembrar em perguntas curtas. A revisão espaçada traz cada cartão de volta no momento certo." />
      ) : (
        <section className="rounded-xl border border-line bg-surface">
          <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <h3 className="text-[14px] font-semibold text-fg">
              {flashcards.length} {flashcards.length === 1 ? "cartão" : "cartões"}
            </h3>
            {flashcards.length > 6 && (
              <div className="relative ml-auto w-full sm:w-60">
                <MagnifyingGlassIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cartões" aria-label="Buscar cartões" data-size="sm" className="q-input pl-8!" />
              </div>
            )}
          </header>
          <ul className="divide-y divide-line-soft">
            {visible.map((card) => {
              const days = daysBetween(today, card.next_review_date);
              return (
                <li key={card.id} className={cx("group px-4 py-3", editingId === card.id && "bg-canvas/40")}>
                  {editingId === card.id ? (
                    <FlashcardEditor
                      initial={{ front: card.front, back: card.back }}
                      submitLabel="Salvar"
                      busy={updating}
                      onSubmit={async (front, back) => {
                        await onUpdate(card.id, front, back);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                        <p className="whitespace-pre-wrap break-words text-[13.5px] font-medium text-fg">{card.front}</p>
                        <p className="whitespace-pre-wrap break-words text-[13.5px] text-fg-3">{card.back}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {days <= 0 ? <Badge tone="gold">Revisar hoje</Badge> : <span className="text-xs text-fg-4">{card.repetitions === 0 ? "novo" : `volta ${formatInterval(days) === "amanhã" ? "amanhã" : `em ${formatInterval(days)}`}`}</span>}
                        <DropdownMenu
                          label="Ações do cartão"
                          items={[
                            { label: "Editar", icon: <PencilSimpleIcon />, onSelect: () => setEditingId(card.id) },
                            { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setDeleting(card) },
                          ]}
                          trigger={(props) => (
                            <button type="button" {...props} aria-label="Ações do cartão" className="flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100">
                              <DotsThreeIcon size={18} weight="bold" />
                            </button>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-fg-3">Nenhum cartão com “{query}”.</li>}
          </ul>
        </section>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Excluir cartão?"
        description={deleting ? `“${deleting.front.slice(0, 80)}” e o histórico de revisões dele serão apagados.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDelete(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
