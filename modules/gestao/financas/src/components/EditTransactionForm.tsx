import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import { financeActionError } from "../financeErrors";
import { parseBRLInput } from "../service";
import type { Category, Transaction, UpdateTransactionInput } from "../types";

const STATUS_LABEL: Record<Transaction["status"], string> = {
  concluida: "Concluída",
  futura: "Futura",
  pendente: "Pendente",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export function EditTransactionForm({
  transaction,
  categories,
  onSave,
  onCancel,
}: {
  transaction: Transaction;
  categories: Category[];
  onSave: (input: UpdateTransactionInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(transaction.name);
  const [amount, setAmount] = useState(String(transaction.amount).replace(".", ","));
  const [date, setDate] = useState(transaction.date);
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [status, setStatus] = useState<Transaction["status"]>(transaction.status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const categoryKind = transaction.transaction_type === "entrada" ? "entrada" : "saida";
  const relevantCategories = categories.filter((category) => category.kind === categoryKind);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = parseBRLInput(amount);
    if (!name.trim() || !(parsedAmount > 0) || !date) {
      setError("Informe uma descrição, um valor maior que zero e uma data válida.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        date,
        categoryId: transaction.transaction_type === "transferencia" ? undefined : categoryId || undefined,
        status,
      });
      onCancel();
    } catch (saveError) {
      setError(financeActionError(saveError, "Não foi possível salvar a movimentação. Seus dados continuam preenchidos; tente novamente."));
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = "qv-field min-w-0 px-3 py-2 text-[13px]";

  return (
    <form onSubmit={handleSubmit} className="qv-well flex flex-col gap-3 p-3" aria-label={`Editar ${transaction.name}`}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Descrição
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Valor
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${inputClass} font-mono`} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Data
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} font-mono`} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary">
          Situação
          <select value={status} onChange={(event) => setStatus(event.target.value as Transaction["status"])} className={inputClass}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {transaction.transaction_type !== "transferencia" && (
          <label className="flex min-w-0 flex-col gap-1 text-xs text-text-secondary sm:col-span-2">
            Categoria
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>
              <option value="">Sem categoria</option>
              {relevantCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="quiet" size="sm" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button type="submit" variant="primary" size="sm" disabled={isSaving}>{isSaving ? "Salvando…" : "Salvar alterações"}</Button>
      </div>
    </form>
  );
}
