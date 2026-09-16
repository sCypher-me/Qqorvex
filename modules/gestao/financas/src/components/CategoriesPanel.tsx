import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCategories, useCreateCategory } from "../hooks/useFinancas";
import type { CategoryKind } from "../types";

export function CategoriesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { categories, isLoading } = useCategories(client);
  const createCategory = useCreateCategory(client, userId);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("saida");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createCategory.mutate({ name: trimmed, kind });
    setName("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold text-text-primary">Categorias</h2>
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : categories.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma categoria cadastrada.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="text-xs px-2 py-1 rounded-md border border-border text-text-primary"
            >
              {category.name} · {category.kind === "entrada" ? "Entrada" : "Saída"}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
