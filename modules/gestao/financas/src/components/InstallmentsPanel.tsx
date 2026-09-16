import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCreateInstallmentPurchase, useInstallments } from "../hooks/useFinancas";

export function InstallmentsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { installments, isLoading } = useInstallments(client);
  const createInstallmentPurchase = useCreateInstallmentPurchase(client, userId);

  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    const parsedTotal = Number(totalAmount);
    const parsedCount = Number(installmentCount);
    if (!trimmed || !(parsedTotal > 0) || !(parsedCount > 0)) return;
    createInstallmentPurchase.mutate({
      name: trimmed,
      totalAmount: parsedTotal,
      installmentCount: parsedCount,
      firstInstallmentDate,
    });
    setName("");
    setTotalAmount("");
    setInstallmentCount("2");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Parcelamentos</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : installments.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum parcelamento cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {installments.map((installment) => (
            <li key={installment.id} className="text-sm text-text-primary">
              {installment.name} · R$ {installment.total_amount.toFixed(2)} em {installment.installment_count}x ·
              1ª parcela {installment.first_installment_date}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da compra"
          className="flex-1 min-w-[140px] rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="Valor total"
          type="number"
          step="0.01"
          className="w-28 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          value={installmentCount}
          onChange={(e) => setInstallmentCount(e.target.value)}
          placeholder="Nº parcelas"
          type="number"
          min="1"
          className="w-24 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <input
          type="date"
          value={firstInstallmentDate}
          onChange={(e) => setFirstInstallmentDate(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        />
        <Button type="submit" variant="secondary">
          Parcelar
        </Button>
      </form>
    </div>
  );
}
