import type { Balances } from "../service";
import { formatBRL } from "./TransactionList";

/** "Diferenciar valores positivos, negativos, futuros e pendentes com ícone/texto além de cor." */
export function DashboardCards({ balances, accountCount }: { balances: Balances; accountCount?: number }) {
  const saldoNegativo = balances.saldoAtual < 0;
  const projetadoNegativo = balances.saldoProjetado < 0;
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(210px,1fr))] w-full">
      <SummaryCard
        label="Saldo atual"
        value={`${saldoNegativo ? "− " : ""}${formatBRL(balances.saldoAtual)}`}
        color={saldoNegativo ? "var(--color-error)" : "var(--color-text-primary)"}
        meta={
          accountCount !== undefined
            ? `${accountCount} ${accountCount === 1 ? "conta cadastrada" : "contas cadastradas"}${saldoNegativo ? " · negativo" : ""}`
            : saldoNegativo
              ? "negativo · só transações concluídas"
              : "só transações concluídas"
        }
      />
      <SummaryCard
        label="Entradas realizadas"
        value={formatBRL(balances.entradasRealizadas)}
        color="var(--color-success)"
        meta={`+ ${formatBRL(balances.entradasFuturas)} previstas`}
      />
      <SummaryCard
        label="Saídas realizadas"
        value={formatBRL(balances.saidasRealizadas)}
        color="var(--color-error)"
        meta={`− ${formatBRL(balances.saidasFuturas)} previstas`}
      />
      <SummaryCard
        label="Saldo projetado"
        value={`${projetadoNegativo ? "− " : ""}${formatBRL(balances.saldoProjetado)}`}
        color={projetadoNegativo ? "var(--color-warning)" : "var(--color-text-secondary)"}
        meta={projetadoNegativo ? "fica negativo · inclui futuras e pendentes" : "inclui futuras e pendentes"}
      />
    </div>
  );
}

function SummaryCard({ label, value, color, meta }: { label: string; value: string; color: string; meta: string }) {
  return (
    <div className="qv-card p-[18px] flex flex-col gap-2 shadow-[0_1px_2px_rgba(0,0,0,.5),0_12px_30px_rgba(0,0,0,.28)]">
      <span className="qv-eyebrow font-normal">{label}</span>
      <span className="font-mono text-2xl font-semibold whitespace-nowrap tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-text-secondary">{meta}</span>
    </div>
  );
}
