import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import {
  useCreateRecurringTransaction,
  useGenerateOccurrence,
  useRecurringTransactions,
  useUpdateRecurringStatus,
} from "../hooks/useFinancas";
import type { RecurrenceFrequency, TransactionType } from "../types";

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

/**
 * "Assinatura é uma recorrência de saída com is_subscription=true; mesma tabela." Um único painel
 * cobre Recorrências e Assinaturas — a diferenciação é só o checkbox no formulário.
 */
export function RecurringTransactionsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { recurringTransactions, isLoading } = useRecurringTransactions(client);
  const createRecurring = useCreateRecurringTransaction(client, userId);
  const updateStatus = useUpdateRecurringStatus(client);
  const generateOccurrence = useGenerateOccurrence(client, userId);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<Exclude<TransactionType, "transferencia">>("saida");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("mensal");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubscription, setIsSubscription] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedAmount = Number(amount);
    if (!trimmed || !(parsedAmount > 0)) return;
    createRecurring.mutate({ name: trimmed, amount: parsedAmount, transactionType, frequency, startDate, isSubscription });
    setName("");
    setAmount("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Recorrências &amp; Assinaturas</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : recurringTransactions.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recurringTransactions.map((recurring) => (
            <li
              key={recurring.id}
              className="bg-surface-2 border border-border rounded-md p-3 flex items-center justify-between gap-2 text-sm text-text-primary"
            >
              <div>
                <p>
                  {recurring.name}
                  {recurring.is_subscription ? " · Assinatura" : ""}
                </p>
                <p className="text-xs text-text-secondary-warm">
                  {FREQUENCY_LABEL[recurring.frequency]} · próxima cobrança {recurring.next_occurrence_date} ·{" "}
                  {recurring.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => generateOccurrence.mutate(recurring)}
                  disabled={recurring.status !== "ativa" || generateOccurrence.isPending}
                  className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1 disabled:opacity-50"
                >
                  Gerar cobrança agora
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStatus.mutate({ id: recurring.id, status: recurring.status === "ativa" ? "pausada" : "ativa" })
                  }
                  className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
                >
                  {recurring.status === "ativa" ? "Pausar" : "Reativar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="flex-1 min-w-[140px] rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor"
          type="number"
          step="0.01"
          className="w-28 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value as Exclude<TransactionType, "transferencia">)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        />
        <label className="flex items-center gap-1 text-xs text-text-secondary-warm">
          <input type="checkbox" checked={isSubscription} onChange={(e) => setIsSubscription(e.target.checked)} />
          Assinatura
        </label>
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
