import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState } from "@qqorvex/ui";
import { useCreateInstallmentPurchase, useInstallments } from "../hooks/useFinancas";
import { formatBRL, parseBRLInput } from "./TransactionList";

function formatIsoDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

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
    const parsedTotal = parseBRLInput(totalAmount);
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
    <div className="qv-card overflow-hidden">
      <CardHeader divider title="Parcelamentos" meta={isLoading ? undefined : `${installments.length}`} />
      {isLoading ? (
        <EmptyState className="px-[18px] py-4">Carregando...</EmptyState>
      ) : installments.length === 0 ? (
        <EmptyState className="px-[18px] py-4">
          Nenhum parcelamento cadastrado. Ao parcelar, cada parcela vira uma transação futura.
        </EmptyState>
      ) : (
        <ul>
          {installments.map((installment) => (
            <li key={installment.id} className="qv-row flex items-center gap-[14px] px-[18px] py-[13px]">
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate">{installment.name}</span>
                <span className="font-mono text-xs text-text-muted">
                  {installment.installment_count}x · 1ª parcela {formatIsoDate(installment.first_installment_date)}
                </span>
              </div>
              <span className="font-mono text-sm font-medium whitespace-nowrap text-text-primary">
                {formatBRL(installment.total_amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap gap-2 px-[18px] py-[14px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da compra"
          aria-label="Nome da compra"
          className="qv-field flex-[2_1_160px] py-2"
        />
        <input
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="Valor total R$"
          aria-label="Valor total"
          inputMode="decimal"
          className="qv-field flex-[0_1_140px] py-2 font-mono text-[13px]"
        />
        <input
          value={installmentCount}
          onChange={(e) => setInstallmentCount(e.target.value)}
          placeholder="Nº parcelas"
          aria-label="Número de parcelas"
          type="number"
          min="1"
          className="qv-field flex-[0_1_100px] py-2 font-mono text-[13px]"
        />
        <input
          type="date"
          value={firstInstallmentDate}
          onChange={(e) => setFirstInstallmentDate(e.target.value)}
          aria-label="Data da primeira parcela"
          className="qv-field flex-[0_1_160px] py-2 font-mono text-[13px]"
        />
        <Button type="submit" variant="primary" size="sm" disabled={createInstallmentPurchase.isPending}>
          Parcelar
        </Button>
      </form>
    </div>
  );
}
