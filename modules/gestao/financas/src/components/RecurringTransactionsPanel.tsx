import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, CardHeader, EmptyState, SkeletonList } from "@qqorvex/ui";
import {
  useCreateRecurringTransaction,
  useGenerateOccurrence,
  useRecurringTransactions,
  useUpdateRecurringStatus,
  useAccounts,
  useCards,
  useCategories,
} from "../hooks/useFinancas";
import type { RecurrenceFrequency, TransactionType } from "../types";
import { formatSignedBRL, parseBRLInput } from "./TransactionList";
import { financeActionError } from "../financeErrors";
import { formatLocalDate } from "../service";

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
  const { accounts } = useAccounts(client);
  const { cards } = useCards(client);
  const { categories } = useCategories(client);
  const createRecurring = useCreateRecurringTransaction(client, userId);
  const updateStatus = useUpdateRecurringStatus(client);
  const generateOccurrence = useGenerateOccurrence(client, userId);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<Exclude<TransactionType, "transferencia">>("saida");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("mensal");
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));
  const [isSubscription, setIsSubscription] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedAmount = parseBRLInput(amount);
    if (!trimmed || !(parsedAmount > 0) || !startDate) {
      setError("Informe um nome, um valor maior que zero e uma data de início válida.");
      return;
    }
    setError("");
    try {
      await createRecurring.mutateAsync({
        name: trimmed,
        amount: parsedAmount,
        transactionType,
        frequency,
        startDate,
        isSubscription,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        cardId: cardId || undefined,
      });
      setName("");
      setAmount("");
      setCategoryId("");
      setCardId("");
    } catch (saveError) {
      setError(financeActionError(saveError, "Não foi possível salvar a recorrência. Seus dados continuam preenchidos."));
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(financeActionError(actionError, "Não foi possível concluir a ação. Tente novamente."));
    }
  }

  const activeCount = recurringTransactions.filter((r) => r.status === "ativa").length;
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const accountById = new Map(accounts.map((account) => [account.id, account.name]));
  const cardById = new Map(cards.map((card) => [card.id, card.nickname]));

  return (
    <div className="qv-card overflow-hidden">
      <CardHeader
        divider
        title="Recorrências & Assinaturas"
        meta={isLoading ? undefined : `${activeCount} ${activeCount === 1 ? "ativa" : "ativas"}`}
      />
      {isLoading ? (
        <SkeletonList rows={3} />
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
                    {recurring.category_id && <span> · {categoryById.get(recurring.category_id) ?? "Categoria removida"}</span>}
                    {recurring.card_id && <span> · {cardById.get(recurring.card_id) ?? "Cartão removido"}</span>}
                    {!recurring.card_id && recurring.account_id && <span> · {accountById.get(recurring.account_id) ?? "Conta removida"}</span>}
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
                    onClick={() => void runAction(() => generateOccurrence.mutateAsync(recurring))}
                    disabled={!isActive || generateOccurrence.isPending}
                  >
                    Registrar próxima cobrança
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    size="xs"
                    onClick={() => void runAction(() => updateStatus.mutateAsync({ id: recurring.id, status: isActive ? "pausada" : "ativa" }))}
                    disabled={updateStatus.isPending}
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
          maxLength={100}
          required
          className="qv-field flex-[2_1_160px] py-2"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="R$ 0,00"
          aria-label="Valor"
          inputMode="decimal"
          required
          className="qv-field flex-[0_1_120px] py-2 font-mono text-[13px]"
        />
        <select
          value={transactionType}
          onChange={(e) => {
            setTransactionType(e.target.value as Exclude<TransactionType, "transferencia">);
            setCategoryId("");
            setCardId("");
          }}
          aria-label="Tipo"
          className="qv-field flex-[0_1_120px] py-2 px-3 text-[13px]"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Categoria da recorrência"
          className="qv-field flex-[1_1_145px] py-2 px-3 text-[13px]"
        >
          <option value="">Sem categoria</option>
          {categories.filter((category) => category.kind === transactionType).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          aria-label="Conta da recorrência"
          className="qv-field flex-[1_1_145px] py-2 px-3 text-[13px]"
        >
          <option value="">Sem conta</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        {transactionType === "saida" && cards.length > 0 && (
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            aria-label="Cartão da recorrência"
            className="qv-field flex-[1_1_145px] py-2 px-3 text-[13px]"
          >
            <option value="">Sem cartão</option>
            {cards.map((card) => <option key={card.id} value={card.id}>{card.nickname}</option>)}
          </select>
        )}
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
          required
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
          {createRecurring.isPending ? "Salvando…" : "Adicionar"}
        </Button>
      </form>
      {error && <p role="alert" className="px-[18px] pb-3 text-xs text-error">{error}</p>}
    </div>
  );
}
