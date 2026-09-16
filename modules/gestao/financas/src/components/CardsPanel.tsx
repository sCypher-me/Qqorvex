import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCards, useCreateCard } from "../hooks/useFinancas";
import { CardStatementPanel } from "./CardStatementPanel";

export function CardsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { cards, isLoading } = useCards(client);
  const createCard = useCreateCard(client, userId);
  const [nickname, setNickname] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    createCard.mutate({
      nickname: trimmed,
      closingDay: closingDay ? Number(closingDay) : undefined,
      dueDay: dueDay ? Number(dueDay) : undefined,
    });
    setNickname("");
    setClosingDay("");
    setDueDay("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Cartões</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : cards.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum cartão cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm text-text-primary">
                <span>
                  {card.nickname}
                  {card.institution ? ` · ${card.institution}` : ""}
                  {card.last_digits ? ` · final ${card.last_digits}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedCardId((id) => (id === card.id ? null : card.id))}
                  className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
                >
                  {expandedCardId === card.id ? "Ocultar fatura" : "Ver fatura"}
                </button>
              </div>
              {expandedCardId === card.id && <CardStatementPanel client={client} userId={userId} card={card} />}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Apelido do cartão"
          className="flex-1 min-w-[140px] rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          placeholder="Dia fechamento"
          type="number"
          min="1"
          max="28"
          className="w-32 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          placeholder="Dia vencimento"
          type="number"
          min="1"
          max="28"
          className="w-32 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
