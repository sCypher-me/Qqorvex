import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useAccounts, useCreateAccount } from "../hooks/useFinancas";
import type { Account } from "../types";

const ACCOUNT_TYPE_LABEL: Record<Account["account_type"], string> = {
  dinheiro: "Dinheiro",
  conta_bancaria: "Conta bancária",
  carteira_digital: "Carteira digital",
  outro: "Outro",
};

export function AccountsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { accounts, isLoading } = useAccounts(client);
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
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Contas</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : accounts.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma conta cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between text-sm text-text-primary">
              <span>{account.name}</span>
              <span className="text-xs text-text-secondary-warm">{ACCOUNT_TYPE_LABEL[account.account_type]}</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da conta"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as Account["account_type"])}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
