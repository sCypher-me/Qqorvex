import type { SupabaseClient, Database } from "@qqorvex/database";
import { localDateKey, localDateKeyInDays, type HojeItem } from "@qqorvex/module-hoje";
import { listTransactions } from "./repository";
import { computeBalances } from "./service";

/**
 * "Hoje pode exibir resumo financeiro compacto: saldo atual, saldo projetado, próximas
 * cobranças." Hoje nunca recalcula nem modifica dados financeiros — só exibe o que este
 * provider já resolveu usando `computeBalances`.
 */
export function createFinancasHojeProvider(client: SupabaseClient<Database>) {
  return async function financasHojeProvider(): Promise<HojeItem[]> {
    const transactions = await listTransactions(client);
    const balances = computeBalances(transactions);

    const items: HojeItem[] = [
      {
        id: "financas-saldo",
        source: "financas",
        title: `Saldo atual: R$ ${balances.saldoAtual.toFixed(2)}`,
      },
    ];

    const today = localDateKey();
    const soonStr = localDateKeyInDays(7);

    const upcoming = transactions.filter(
      (t) => t.transaction_type === "saida" && t.status === "futura" && t.date >= today && t.date <= soonStr,
    );
    for (const t of upcoming) {
      items.push({
        id: t.id,
        source: "financas",
        title: `Cobrança: ${t.name} (R$ ${t.amount.toFixed(2)})`,
        time: t.date,
      });
    }

    return items;
  };
}
