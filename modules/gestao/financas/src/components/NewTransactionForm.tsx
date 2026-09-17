import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import { PAYMENT_METHOD_LABELS } from "../service";
import type { Account, Card, Category, NewTransactionInput, TransactionType } from "../types";
import { parseBRLInput } from "./TransactionList";

/** `credito` fica de fora do seletor — é representado escolhendo um Cartão, não aqui. */
const SELECTABLE_PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS).filter(([value]) => value !== "credito");

/**
 * "Campos Obrigatórios para Entrada/Saída: Nome, Valor, Categoria, Data." Transferência exige
 * conta destino. `vehicles` usa um formato mínimo (não o tipo `Vehicle` de
 * `@qqorvex/module-vida-pessoal`) pra não criar dependência de pacote na direção errada —
 * Finanças não conhece Veículos, só o campo `vehicle_id` (docs/decisions/pending.md).
 * Visual: barra de lançamento rápido num card; campos secundários ficam em "Mais opções".
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
  const [showMore, setShowMore] = useState(false);

  const isTransfer = transactionType === "transferencia";
  // Escolher um Cartão já é "crédito" de forma inequívoca — não faz sentido perguntar de novo.
  const effectivePaymentMethod = cardId ? "credito" : paymentMethod || undefined;
  const relevantCategories = categories.filter((c) => c.kind === (transactionType === "entrada" ? "entrada" : "saida"));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedAmount = parseBRLInput(amount);
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

  const fieldBase = "qv-field px-3 text-[13px]";
  const selectClass = `${fieldBase} flex-[0_1_150px]`;

  return (
    <form onSubmit={handleSubmit} className="qv-card p-[14px] flex flex-col gap-[10px]">
      <div className="flex gap-[10px] flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Descrição"
          aria-label="Descrição"
          className="qv-field flex-[2_1_180px]"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="R$ 0,00"
          aria-label="Valor"
          inputMode="decimal"
          className="qv-field flex-[0_1_130px] font-mono"
        />
        <select
          value={transactionType}
          onChange={(e) => {
            setTransactionType(e.target.value as TransactionType);
            setCategoryId("");
          }}
          aria-label="Tipo"
          className={`${fieldBase} flex-[0_1_130px]`}
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
          <option value="transferencia">Transferência</option>
        </select>
        {!isTransfer && (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Categoria"
            className={selectClass}
          >
            <option value="">Categoria</option>
            {relevantCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Conta" className={selectClass}>
          <option value="">{isTransfer ? "Conta de origem" : "Conta"}</option>
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
            aria-label="Conta de destino"
            className={selectClass}
          >
            <option value="">Conta de destino</option>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        )}
        <Button type="submit" variant="primary" className="px-5">
          Lançar
        </Button>
      </div>

      <div className="flex gap-[10px] flex-wrap items-center">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="qv-btn qv-btn-ghost qv-btn-xs"
        >
          {showMore ? "Menos opções" : "Mais opções"}
        </button>
        {!showMore && (
          <span className="font-mono text-xs text-text-muted">
            {date === new Date().toISOString().slice(0, 10) ? "data: hoje" : `data: ${date.split("-").reverse().join("/")}`}
          </span>
        )}
        {showMore && (
          <>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Data"
              className="qv-field flex-[0_1_160px] py-2 font-mono text-[13px]"
            />
            {!isTransfer && cards.length > 0 && (
              <select value={cardId} onChange={(e) => setCardId(e.target.value)} aria-label="Cartão" className={`${selectClass} py-2`}>
                <option value="">Cartão (opcional)</option>
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
                aria-label="Veículo"
                className={`${selectClass} py-2`}
              >
                <option value="">Veículo (opcional)</option>
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
                aria-label="Forma de pagamento"
                className={`${fieldBase} flex-[0_1_200px] py-2`}
              >
                <option value="">Forma de pagamento (opcional)</option>
                {SELECTABLE_PAYMENT_METHODS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>
    </form>
  );
}
