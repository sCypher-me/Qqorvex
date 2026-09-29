import { useEffect, useState, type FormEvent } from "react";
import { ArrowsLeftRightIcon, CurrencyCircleDollarIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { Button, Input, Modal, Notice, Segmented, Select } from "@qqorvex/ui";
import { financeActionError } from "../financeErrors";
import { formatLocalDate, parseBRLInput, PAYMENT_METHOD_LABELS } from "../service";
import type { Account, Card, Category, NewTransactionInput, PaymentMethod, Transaction, TransactionStatus, TransactionType, UpdateTransactionInput } from "../types";

const STATUS_OPTIONS: Array<{ value: TransactionStatus; label: string }> = [
  { value: "concluida", label: "Concluída (já aconteceu)" },
  { value: "futura", label: "Agendada (vai acontecer)" },
  { value: "pendente", label: "Pendente" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" },
];

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).filter(([value]) => value !== "credito");

export interface TransactionFormProps {
  isOpen: boolean;
  /** Transação existente (edição) ou `null` (nova). */
  transaction: Transaction | null;
  defaults?: Partial<Pick<NewTransactionInput, "transactionType" | "date" | "name" | "amount" | "categoryId">>;
  accounts: Account[];
  categories: Category[];
  cards: Card[];
  vehicles?: Array<{ id: string; nickname: string }>;
  onClose: () => void;
  onCreate: (input: NewTransactionInput) => Promise<unknown>;
  onUpdate: (id: string, input: UpdateTransactionInput) => Promise<unknown>;
}

/** Formulário único de lançamento (criar e editar). Cartão implica pagamento no crédito. */
export function TransactionForm({ isOpen, transaction, defaults, accounts, categories, cards, vehicles = [], onClose, onCreate, onUpdate }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("saida");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState(""); // "account:<id>" | "card:<id>" | ""
  const [transferTo, setTransferTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState<TransactionStatus | "">("");
  const [tags, setTags] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setType(transaction?.transaction_type ?? defaults?.transactionType ?? "saida");
    setName(transaction?.name ?? defaults?.name ?? "");
    setAmount(transaction ? transaction.amount.toFixed(2).replace(".", ",") : defaults?.amount ? defaults.amount.toFixed(2).replace(".", ",") : "");
    setDate(transaction?.date ?? defaults?.date ?? formatLocalDate(new Date()));
    setCategoryId(transaction?.category_id ?? defaults?.categoryId ?? "");
    setSource(transaction?.card_id ? `card:${transaction.card_id}` : transaction?.account_id ? `account:${transaction.account_id}` : "");
    setTransferTo(transaction?.transfer_to_account_id ?? "");
    setPaymentMethod(transaction?.payment_method && transaction.payment_method !== "credito" ? transaction.payment_method : "");
    setStatus(transaction?.status ?? "");
    setTags(transaction?.tags.join(", ") ?? "");
    setVehicleId(transaction?.vehicle_id ?? "");
    setError(null);
    setSaving(false);
  }, [isOpen, transaction, defaults]);

  const isTransfer = type === "transferencia";
  const relevantCategories = categories.filter((category) => category.kind === (type === "entrada" ? "entrada" : "saida"));
  const [sourceKind, sourceId] = source.split(":") as ["account" | "card" | "", string | undefined];

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = parseBRLInput(amount);
    if (!name.trim()) return setError("Descreva o lançamento.");
    if (!(parsedAmount > 0)) return setError("Informe um valor maior que zero.");
    if (!date) return setError("Informe a data.");
    if (isTransfer && (sourceKind !== "account" || !transferTo)) return setError("Escolha a conta de origem e a de destino.");
    if (isTransfer && sourceId === transferTo) return setError("Origem e destino precisam ser contas diferentes.");
    setSaving(true);
    setError(null);
    const parsedTags = [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))];
    const accountId = sourceKind === "account" ? sourceId ?? null : null;
    const cardId = !isTransfer && sourceKind === "card" ? sourceId ?? null : null;
    const method = (cardId ? "credito" : paymentMethod || null) as PaymentMethod;
    try {
      if (transaction) {
        await onUpdate(transaction.id, {
          name: name.trim(),
          amount: parsedAmount,
          date,
          categoryId: isTransfer ? undefined : categoryId || undefined,
          status: status || transaction.status,
          accountId,
          cardId,
          transferToAccountId: isTransfer ? transferTo : null,
          paymentMethod: isTransfer ? null : method,
          tags: parsedTags,
        });
      } else {
        await onCreate({
          name: name.trim(),
          amount: parsedAmount,
          transactionType: type,
          date,
          categoryId: isTransfer ? undefined : categoryId || undefined,
          accountId: accountId ?? undefined,
          cardId: cardId ?? undefined,
          transferToAccountId: isTransfer ? transferTo : undefined,
          paymentMethod: isTransfer ? undefined : method ?? undefined,
          status: status || undefined,
          tags: parsedTags,
          vehicleId: !isTransfer && vehicleId ? vehicleId : undefined,
        });
      }
      onClose();
    } catch (caught) {
      setError(financeActionError(caught, "Não foi possível salvar. Seus dados continuam preenchidos; tente de novo."));
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? "Editar lançamento" : "Novo lançamento"}
      size="md"
      icon={<CurrencyCircleDollarIcon />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {transaction ? "Salvar" : "Registrar"}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={submit} className="flex flex-col gap-4">
        {!transaction && (
          <Segmented
            label="Tipo"
            fullWidth
            value={type}
            onChange={(value) => {
              setType(value);
              setCategoryId("");
            }}
            options={[
              { value: "saida", label: "Despesa", icon: <TrendDownIcon /> },
              { value: "entrada", label: "Receita", icon: <TrendUpIcon /> },
              { value: "transferencia", label: "Transferência", icon: <ArrowsLeftRightIcon /> },
            ]}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <Input label="Descrição" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "entrada" ? "Ex.: Salário" : type === "transferencia" ? "Ex.: Reserva de emergência" : "Ex.: Mercado"} maxLength={120} autoFocus data-autofocus />
          <Input label="Valor" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="0,00" leadingIcon={<span className="text-xs font-medium">R$</span>} className="tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          {!isTransfer ? (
            <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {relevantCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          ) : (
            <Select label="Situação" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus | "")}>
              <option value="">Automática pela data</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={isTransfer ? "Sai de" : type === "entrada" ? "Entra em" : "Pago com"} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{isTransfer ? "Escolha a conta" : "Não informar"}</option>
            {accounts.length > 0 && (
              <optgroup label="Contas">
                {accounts.map((account) => (
                  <option key={account.id} value={`account:${account.id}`}>
                    {account.name}
                  </option>
                ))}
              </optgroup>
            )}
            {!isTransfer && type === "saida" && cards.length > 0 && (
              <optgroup label="Cartões de crédito">
                {cards.map((card) => (
                  <option key={card.id} value={`card:${card.id}`}>
                    {card.nickname}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
          {isTransfer ? (
            <Select label="Vai para" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
              <option value="">Escolha a conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          ) : sourceKind === "card" ? (
            <Input label="Forma de pagamento" value="Cartão de crédito" disabled />
          ) : (
            <Select label="Forma de pagamento" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">Não informar</option>
              {PAYMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </div>
        {!isTransfer && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Situação" value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus | "")}>
              <option value="">{transaction ? "Manter" : "Automática pela data"}</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input label="Etiquetas" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="viagem, trabalho" hint="Separe por vírgulas" />
          </div>
        )}
        {!transaction && !isTransfer && vehicles.length > 0 && type === "saida" && (
          <Select label="Veículo (opcional)" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} hint="Para acompanhar os gastos de cada veículo em Vida › Pessoal.">
            <option value="">Nenhum</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.nickname}
              </option>
            ))}
          </Select>
        )}
        {error && <Notice compact>{error}</Notice>}
      </form>
    </Modal>
  );
}
