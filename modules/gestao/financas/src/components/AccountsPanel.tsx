import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState } from "@qqorvex/ui";
import { useAccounts, useCreateAccount, useTransactions } from "../hooks/useFinancas";
import { computeAccountBalance } from "../service";
import type { Account } from "../types";
import { formatBRL } from "./TransactionList";

const ACCOUNT_TYPE_LABEL: Record<Account["account_type"], string> = {
  dinheiro: "Dinheiro",
  conta_bancaria: "Conta bancária",
  carteira_digital: "Carteira digital",
  outro: "Outro",
};

export function AccountsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { accounts, isLoading } = useAccounts(client);
  const { transactions } = useTransactions(client);
  const createAccount = useCreateAccount(client, userId);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<Account["account_type"]>("outro");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createAccount.mutate({ name: trimmed, accountType });
    setName("");
  }

  return (
    <div className="qv-card overflow-hidden">
      <CardHeader divider title="Contas" meta={isLoading ? undefined : `${accounts.length}`} />
      {isLoading ? (
        <EmptyState className="px-[18px] py-4">Carregando...</EmptyState>
      ) : accounts.length === 0 ? (
        <EmptyState className="px-[18px] py-4">Nenhuma conta cadastrada. Adicione a primeira abaixo.</EmptyState>
      ) : (
        <ul>
          {accounts.map((account) => {
            const balance = computeAccountBalance(transactions, account.id);
            return (
              <li key={account.id} className="qv-row flex items-center gap-[14px] px-[18px] py-[13px]">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate">{account.name}</span>
                  <span className="text-xs text-text-muted">{ACCOUNT_TYPE_LABEL[account.account_type]}</span>
                </div>
                <span
                  className={`font-mono text-sm font-medium whitespace-nowrap ${balance < 0 ? "text-error" : "text-text-primary"}`}
                >
                  {balance < 0 ? "− " : ""}
                  {formatBRL(balance)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap gap-2 px-[18px] py-[14px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da conta"
          aria-label="Nome da conta"
          className="qv-field flex-[2_1_160px] py-2"
        />
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as Account["account_type"])}
          aria-label="Tipo de conta"
          className="qv-field flex-[1_1_140px] py-2 px-3 text-[13px]"
        >
          {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" size="sm" disabled={createAccount.isPending}>
          Adicionar
        </Button>
      </form>
    </div>
  );
}
