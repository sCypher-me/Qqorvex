import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import { PAYMENT_METHOD_LABELS } from "../service";
import type { Account, Card, Category, NewTransactionInput, TransactionType } from "../types";

/** `credito` fica de fora do seletor — é representado escolhendo um Cartão, não aqui. */
const SELECTABLE_PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS).filter(([value]) => value !== "credito");

/**
 * "Campos Obrigatórios para Entrada/Saída: Nome, Valor, Categoria, Data." Transferência exige
 * conta destino. `vehicles` usa um formato mínimo (não o tipo `Vehicle` de
 * `@qqorvex/module-vida-pessoal`) pra não criar dependência de pacote na direção errada —
 * Finanças não conhece Veículos, só o campo `vehicle_id` (docs/decisions/pending.md).
 */
export function NewTransactionForm({
  accounts,
  categories,
  cards,
  vehicles,
  onCreate,
}: {
  accounts: Account[];
  categories: Category[];
  cards: Card[];
  vehicles?: { id: string; nickname: string }[];
  onCreate: (input: NewTransactionInput) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("saida");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const isTransfer = transactionType === "transferencia";
  // Escolher um Cartão já é "crédito" de forma inequívoca — não faz sentido perguntar de novo.
  const effectivePaymentMethod = cardId ? "credito" : paymentMethod || undefined;
  const relevantCategories = categories.filter((c) => c.kind === (transactionType === "entrada" ? "entrada" : "saida"));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedAmount = Number(amount);
    if (!trimmed || !(parsedAmount > 0)) return;
    if (isTransfer && !transferToAccountId) return;
    onCreate({
      name: trimmed,
      amount: parsedAmount,
      transactionType,
      date,
      categoryId: isTransfer ? undefined : categoryId || undefined,
      accountId: accountId || undefined,
      transferToAccountId: isTransfer ? transferToAccountId : undefined,
      cardId: isTransfer ? undefined : cardId || undefined,
      vehicleId: isTransfer ? undefined : vehicleId || undefined,
      paymentMethod: isTransfer ? undefined : (effectivePaymentMethod as NewTransactionInput["paymentMethod"]),
    });
    setName("");
    setAmount("");
    setCategoryId("");
    setPaymentMethod("");
  }

  return (
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
        onChange={(e) => {
          setTransactionType(e.target.value as TransactionType);
          setCategoryId("");
        }}
        className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
      >
        <option value="saida">Saída</option>
        <option value="entrada">Entrada</option>
        <option value="transferencia">Transferência</option>
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
      />
      {!isTransfer && (
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="">Categoria...</option>
          {relevantCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      )}
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
      >
        <option value="">{isTransfer ? "Conta de origem..." : "Conta..."}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      {isTransfer && (
        <select
          value={transferToAccountId}
          onChange={(e) => setTransferToAccountId(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="">Conta de destino...</option>
          {accounts
            .filter((a) => a.id !== accountId)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
        </select>
      )}
      {!isTransfer && cards.length > 0 && (
        <select
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="">Cartão (opcional)...</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.nickname}
            </option>
          ))}
        </select>
      )}
      {!isTransfer && vehicles && vehicles.length > 0 && (
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="">Veículo (opcional)...</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.nickname}
            </option>
          ))}
        </select>
      )}
      {!isTransfer && !cardId && (
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="">Forma de pagamento (opcional)...</option>
          {SELECTABLE_PAYMENT_METHODS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      <Button type="submit" variant="primary">
        Adicionar
      </Button>
    </form>
  );
}
