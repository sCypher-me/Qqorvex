import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, CardHeader, EmptyState } from "@qqorvex/ui";
import {
  useCreateRecurringTransaction,
  useGenerateOccurrence,
  useRecurringTransactions,
  useUpdateRecurringStatus,
} from "../hooks/useFinancas";
import type { RecurrenceFrequency, TransactionType } from "../types";
import { formatSignedBRL, parseBRLInput } from "./TransactionList";

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function formatIsoDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

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
    const parsedAmount = parseBRLInput(amount);
    if (!trimmed || !(parsedAmount > 0)) return;
    createRecurring.mutate({ name: trimmed, amount: parsedAmount, transactionType, frequency, startDate, isSubscription });
    setName("");
    setAmount("");
  }

  const activeCount = recurringTransactions.filter((r) => r.status === "ativa").length;

  return (
    <div className="qv-card overflow-hidden">
      <CardHeader
        divider
        title="Recorrências & Assinaturas"
        meta={isLoading ? undefined : `${activeCount} ${activeCount === 1 ? "ativa" : "ativas"}`}
      />
      {isLoading ? (
        <EmptyState className="px-[18px] py-4">Carregando...</EmptyState>
      ) : recurringTransactions.length === 0 ? (
        <EmptyState className="px-[18px] py-4">
          Nenhuma recorrência cadastrada. Contas fixas e assinaturas aparecem aqui e no calendário financeiro.
        </EmptyState>
      ) : (
        <ul>
          {recurringTransactions.map((recurring) => {
            const isActive = recurring.status === "ativa";
            const isEntrada = recurring.transaction_type === "entrada";
            return (
              <li key={recurring.id} className="qv-row flex items-center gap-[14px] px-[18px] py-[13px] flex-wrap">
                <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate flex items-center gap-2">
                    {recurring.name}
                    {recurring.is_subscription && <Badge tone="outline">Assinatura</Badge>}
                    {!isActive && <Badge tone="warning">{recurring.status}</Badge>}
                  </span>
                  <span className="text-xs text-text-muted">
                    {FREQUENCY_LABEL[recurring.frequency]} · próxima cobrança{" "}
                    <span className="font-mono">{formatIsoDate(recurring.next_occurrence_date)}</span>
                  </span>
                </div>
                <span
                  className={`font-mono text-sm font-medium whitespace-nowrap ${isEntrada ? "text-success" : "text-error"} ${
                    isActive ? "" : "opacity-60"
                  }`}
                >
                  {formatSignedBRL(recurring.amount, isEntrada ? "+" : "-")}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="quiet"
                    size="xs"
                    onClick={() => generateOccurrence.mutate(recurring)}
                    disabled={!isActive || generateOccurrence.isPending}
                  >
                    Gerar cobrança agora
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    size="xs"
                    onClick={() => updateStatus.mutate({ id: recurring.id, status: isActive ? "pausada" : "ativa" })}
                  >
                    {isActive ? "Pausar" : "Reativar"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap items-center gap-2 px-[18px] py-[14px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          aria-label="Nome da recorrência"
          className="qv-field flex-[2_1_160px] py-2"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="R$ 0,00"
          aria-label="Valor"
          inputMode="decimal"
          className="qv-field flex-[0_1_120px] py-2 font-mono text-[13px]"
        />
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value as Exclude<TransactionType, "transferencia">)}
          aria-label="Tipo"
          className="qv-field flex-[0_1_120px] py-2 px-3 text-[13px]"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
          aria-label="Frequência"
          className="qv-field flex-[0_1_130px] py-2 px-3 text-[13px]"
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
          aria-label="Data de início"
          className="qv-field flex-[0_1_160px] py-2 font-mono text-[13px]"
        />
        <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            className="qv-check"
            checked={isSubscription}
            onChange={(e) => setIsSubscription(e.target.checked)}
          />
          Assinatura
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={createRecurring.isPending}>
          Adicionar
        </Button>
      </form>
    </div>
  );
}
