import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState, Skeleton } from "@qqorvex/ui";
import { useCategories, useCreateCategory } from "../hooks/useFinancas";
import type { CategoryKind } from "../types";
import { financeCategoryColor } from "./TransactionList";
import { financeActionError } from "../financeErrors";

export function CategoriesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { categories, isLoading } = useCategories(client);
  const createCategory = useCreateCategory(client, userId);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("saida");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    try {
      await createCategory.mutateAsync({ name: trimmed, kind });
      setName("");
    } catch (saveError) {
      setError(financeActionError(saveError, "Não foi possível criar a categoria. Seus dados continuam preenchidos."));
    }
  }

  const groups: { kind: CategoryKind; label: string }[] = [
    { kind: "saida", label: "Saídas" },
    { kind: "entrada", label: "Entradas" },
  ];

  return (
    <div className="qv-card overflow-hidden">
      <CardHeader divider title="Categorias" meta={isLoading ? undefined : `${categories.length}`} />
      <div className="px-[18px] py-[14px] flex flex-col gap-[14px]">
        {isLoading ? (
          <div role="status" aria-label="Carregando" className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState>Nenhuma categoria cadastrada. Categorias dão cor às transações e permitem orçamentos.</EmptyState>
        ) : (
          groups.map((group) => {
            const items = categories.filter((c) => c.kind === group.kind);
            if (items.length === 0) return null;
            return (
              <div key={group.kind} className="flex flex-col gap-2">
                <span className="qv-eyebrow">{group.label}</span>
                <ul className="flex flex-wrap gap-2">
                  {items.map((category) => (
                    <li key={category.id} className="qv-pill qv-pill-outline text-xs py-1 px-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: financeCategoryColor(category.id) }} />
                      {category.name}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={handleSubmit} className="qv-row-top flex flex-wrap gap-2 px-[18px] py-[14px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          aria-label="Nome da categoria"
          maxLength={60}
          required
          className="qv-field flex-[2_1_160px] py-2"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
          aria-label="Tipo de categoria"
          className="qv-field flex-[0_1_130px] py-2 px-3 text-[13px]"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <Button type="submit" variant="primary" size="sm" disabled={createCategory.isPending}>
          Adicionar
        </Button>
      </form>
      {error && <p role="alert" className="px-[18px] pb-3 text-xs text-error">{error}</p>}
    </div>
  );
}
