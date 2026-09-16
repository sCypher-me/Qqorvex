import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import {
  useEnsureCurrentStatement,
  useMarkStatementPaid,
  useCardStatements,
  useTransactionsForCardInPeriod,
} from "../hooks/useFinancas";
import { computeStatementDueDate, computeStatementPeriod, computeStatementTotal, toReferenceMonth } from "../service";
import type { Card } from "../types";

/**
 * "Fatura/fechamento de cartão" — total sempre calculado a partir das transações do cartão no
 * período (nunca duplicado). A fatura só vira uma linha persistida (`card_statements`) quando o
 * usuário marca como paga; até lá, período/total são só cálculo em TS.
 */
export function CardStatementPanel({
  client,
  userId,
  card,
}: {
  client: SupabaseClient<Database>;
  userId: string;
  card: Card;
}) {
  const hasClosingConfig = card.closing_day !== null && card.due_day !== null;
  const closingDay = card.closing_day ?? 1;
  const dueDay = card.due_day ?? 1;

  const now = new Date();
  const { periodStart, periodEnd } = computeStatementPeriod(closingDay, now);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const periodEndIso = periodEnd.toISOString().slice(0, 10);
  const dueDateIso = computeStatementDueDate(periodEnd, dueDay).toISOString().slice(0, 10);
  const referenceMonth = toReferenceMonth(periodEnd);

  const ensureStatement = useEnsureCurrentStatement(client, userId);
  const markPaid = useMarkStatementPaid(client, card.id);
  const { statements } = useCardStatements(client, card.id);
  const { transactions } = useTransactionsForCardInPeriod(client, card.id, periodStartIso, periodEndIso, hasClosingConfig);

  if (!hasClosingConfig) {
    return (
      <p className="font-sans text-xs text-text-secondary-warm">
        Configure o dia de fechamento e vencimento deste cartão para acompanhar a fatura.
      </p>
    );
  }

  const total = computeStatementTotal(transactions);
  const currentStatement = statements.find((s) => s.reference_month === referenceMonth);
  const isClosed = now >= periodEnd;
  const isPaid = currentStatement?.status === "paga";

  async function handleMarkPaid() {
    const statement = currentStatement ?? (await ensureStatement.mutateAsync({ card, referenceDate: now }));
    markPaid.mutate(statement.id);
  }

  return (
    <div className="bg-surface-1 border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-sans text-sm text-text-primary">
            Fatura atual ({periodStartIso} a {periodEndIso})
          </p>
          <p className="font-sans text-xs text-text-secondary-warm">Vence em {dueDateIso}</p>
        </div>
        <span className="font-mono text-sm text-text-primary">R$ {total.toFixed(2)}</span>
      </div>

      <Button
        variant={isPaid ? "ghost" : "secondary"}
        onClick={handleMarkPaid}
        disabled={isPaid || !isClosed || ensureStatement.isPending || markPaid.isPending}
      >
        {isPaid ? "Fatura paga" : isClosed ? "Marcar fatura como paga" : "Fatura ainda aberta"}
      </Button>

      {statements.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-border">
          <p className="font-sans text-xs font-semibold uppercase tracking-wide text-text-secondary-warm">Histórico</p>
          {statements.map((statement) => (
            <p key={statement.id} className="font-sans text-xs text-text-secondary-warm">
              {statement.reference_month} · venc. {statement.due_date} · {statement.status}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
