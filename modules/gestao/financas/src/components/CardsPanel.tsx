import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState } from "@qqorvex/ui";
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
    <div className="qv-card overflow-hidden">
      <CardHeader divider title="Cartões" meta={isLoading ? undefined : `${cards.length}`} />
      {isLoading ? (
        <EmptyState className="px-[18px] py-4">Carregando...</EmptyState>
      ) : cards.length === 0 ? (
        <EmptyState className="px-[18px] py-4">Nenhum cartão cadastrado. Adicione um para acompanhar faturas.</EmptyState>
      ) : (
        <ul>
          {cards.map((card) => (
            <li key={card.id} className="qv-row flex flex-col">
              <div className="flex items-center gap-[14px] px-[18px] py-[13px]">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate">{card.nickname}</span>
                  <span className="text-xs text-text-muted truncate">
                    {[
                      card.institution,
                      card.last_digits ? `final ${card.last_digits}` : null,
                      card.closing_day ? `fecha dia ${card.closing_day}` : null,
                      card.due_day ? `vence dia ${card.due_day}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "sem fechamento configurado"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant={expandedCardId === card.id ? "vex" : "quiet"}
                  size="xs"
                  aria-expanded={expandedCardId === card.id}
                  onClick={() => setExpandedCardId((id) => (id === card.id ? null : card.id))}
                >
                  {expandedCardId === card.id ? "Ocultar fatura" : "Ver fatura"}
                </Button>
              </div>
              {expandedCardId === card.id && (
                <div className="px-[18px] pb-[14px]">
                  <CardStatementPanel client={client} userId={userId} card={card} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap gap-2 px-[18px] py-[14px]">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Apelido do cartão"
          aria-label="Apelido do cartão"
          className="qv-field flex-[2_1_160px] py-2"
        />
        <input
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          placeholder="Dia fechamento"
          aria-label="Dia de fechamento"
          type="number"
          min="1"
          max="28"
          className="qv-field flex-[0_1_140px] py-2 font-mono text-[13px]"
        />
        <input
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          placeholder="Dia vencimento"
          aria-label="Dia de vencimento"
          type="number"
          min="1"
          max="28"
          className="qv-field flex-[0_1_140px] py-2 font-mono text-[13px]"
        />
        <Button type="submit" variant="primary" size="sm" disabled={createCard.isPending}>
          Adicionar
        </Button>
      </form>
    </div>
  );
}
