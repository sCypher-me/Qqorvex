import type { Balances } from "../service";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "Diferenciar valores positivos, negativos, futuros e pendentes com ícone/texto além de cor." */
export function DashboardCards({ balances }: { balances: Balances }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
      <Card label="Saldo Atual" value={formatCurrency(balances.saldoAtual)} tone={balances.saldoAtual >= 0 ? "success" : "error"} />
      <Card label="Saldo Projetado" value={formatCurrency(balances.saldoProjetado)} tone={balances.saldoProjetado >= 0 ? "info" : "warning"} />
      <Card label="Entradas (realizadas)" value={formatCurrency(balances.entradasRealizadas)} tone="success" />
      <Card label="Saídas (realizadas)" value={formatCurrency(balances.saidasRealizadas)} tone="error" />
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "success" | "error" | "info" | "warning" }) {
  const toneClass = {
    success: "text-success",
    error: "text-error",
    info: "text-info",
    warning: "text-warning",
  }[tone];

  return (
    <div className="bg-surface-2 border border-border rounded-md p-3">
      <p className="font-sans text-xs text-text-secondary-warm">{label}</p>
      <p className={`font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
