import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button } from "@qqorvex/ui";
import {
  useEnsureCurrentStatement,
  useMarkStatementPaid,
  useCardStatements,
  useTransactionsForCardInPeriod,
} from "../hooks/useFinancas";
import { computeStatementDueDate, computeStatementPeriod, computeStatementTotal, toReferenceMonth } from "../service";
import type { Card } from "../types";
import { formatBRL } from "./TransactionList";

function formatIsoDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

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
      <div className="qv-well px-[14px] py-3 text-[13px] text-text-secondary">
        Configure o dia de fechamento e vencimento deste cartão para acompanhar a fatura.
      </div>
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
    <div className="qv-well p-[14px] flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">Fatura atual</span>
          <span className="font-mono text-xs text-text-muted">
            {formatIsoDate(periodStartIso)} a {formatIsoDate(periodEndIso)} · vence {formatIsoDate(dueDateIso)}
          </span>
        </div>
        <span className="font-mono text-base font-semibold text-text-primary whitespace-nowrap">{formatBRL(total)}</span>
      </div>

      <Button
        type="button"
        variant={isPaid ? "ghost" : "secondary"}
        size="sm"
        className="self-start"
        onClick={handleMarkPaid}
        disabled={isPaid || !isClosed || ensureStatement.isPending || markPaid.isPending}
      >
        {isPaid ? "Fatura paga" : isClosed ? "Marcar fatura como paga" : "Fatura ainda aberta"}
      </Button>

      {statements.length > 0 && (
        <div className="qv-row-top pt-3 flex flex-col gap-2">
          <span className="qv-eyebrow">Histórico</span>
          {statements.map((statement) => (
            <div key={statement.id} className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-secondary">{statement.reference_month}</span>
              <span className="flex-1 font-mono text-xs text-text-muted">venc. {formatIsoDate(statement.due_date)}</span>
              <Badge tone={statement.status === "paga" ? "success" : "neutral"}>{statement.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
