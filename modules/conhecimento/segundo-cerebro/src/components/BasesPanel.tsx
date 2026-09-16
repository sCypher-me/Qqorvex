import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Card, ConfirmDialog } from "@qqorvex/ui";
import { usePages } from "../hooks/usePages";
import {
  useAddPageToBase,
  useBaseFormulas,
  useBasePageProperties,
  useBasePages,
  useBases,
  useCreateBase,
  useCreateBaseFormula,
  useDeleteBase,
  useDeleteBaseFormula,
  useRemovePageFromBase,
  useUpdateBaseViewConfig,
} from "../hooks/useBases";
import { evaluateFormula } from "../formula";
import { buildFormulaContext } from "../service";
import { parseBaseViewConfig } from "../types";
import type { Base } from "../types";

export function BasesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { bases, isLoading } = useBases(client);
  const createBase = useCreateBase(client, userId);
  const deleteBase = useDeleteBase(client);
  const [name, setName] = useState("");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedBase = bases.find((b) => b.id === selectedBaseId);
  const confirmBase = bases.find((b) => b.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createBase.mutate(trimmed);
    setName("");
  }

  if (selectedBase) {
    return <BaseDetail client={client} base={selectedBase} onBack={() => setSelectedBaseId(null)} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : bases.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma Base criada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bases.map((base) => (
            <li key={base.id}>
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setSelectedBaseId(base.id)} className="text-left flex-1">
                    <p className="font-sans text-sm text-text-primary">{base.name}</p>
                    {base.description && <p className="font-sans text-xs text-text-secondary-warm">{base.description}</p>}
                  </button>
                  <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(base.id)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da Base"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <Button type="submit" variant="secondary">
          Criar Base
        </Button>
      </form>
      <ConfirmDialog
        isOpen={confirmBase !== null}
        title={`Excluir a Base "${confirmBase?.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmBase) deleteBase.mutate(confirmBase.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function BaseDetail({ client, base, onBack }: { client: SupabaseClient<Database>; base: Base; onBack: () => void }) {
  const { pages: allPages } = usePages(client);
  const { pages: memberPages } = useBasePages(client, base.id);
  const addPage = useAddPageToBase(client, base.id);
  const removePage = useRemovePageFromBase(client, base.id);
  const { formulas } = useBaseFormulas(client, base.id);
  const createFormula = useCreateBaseFormula(client, base.id);
  const deleteFormula = useDeleteBaseFormula(client, base.id);
  const updateViewConfig = useUpdateBaseViewConfig(client);
  const { properties } = useBasePageProperties(
    client,
    base.id,
    memberPages.map((p) => p.id),
  );

  const view = parseBaseViewConfig(base);
  const [filterText, setFilterText] = useState(view.filterText ?? "");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [formulaKey, setFormulaKey] = useState("");
  const [formulaExpression, setFormulaExpression] = useState("");

  const memberIds = new Set(memberPages.map((p) => p.id));
  const addablePages = allPages.filter((p) => !memberIds.has(p.id));

  const filtered = memberPages.filter((p) => p.title.toLowerCase().includes(filterText.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    if (!view.sortByProperty) return 0;
    const aValue = properties.find((prop) => prop.page_id === a.id && prop.key === view.sortByProperty)?.value;
    const bValue = properties.find((prop) => prop.page_id === b.id && prop.key === view.sortByProperty)?.value;
    const direction = view.sortDirection === "desc" ? -1 : 1;
    return String(aValue ?? "").localeCompare(String(bValue ?? "")) * direction;
  });

  function evaluateForPage(pageId: string, expression: string): string {
    const pageProperties = properties.filter((p) => p.page_id === pageId);
    try {
      const result = evaluateFormula(expression, buildFormulaContext(pageProperties));
      return result === null ? "—" : String(result);
    } catch {
      return "erro";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-text-secondary-warm hover:text-text-primary">
          ‹ Todas as Bases
        </button>
        <h3 className="font-display text-lg font-semibold text-text-primary">{base.name}</h3>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
          }}
          onBlur={() => updateViewConfig.mutate({ baseId: base.id, viewConfig: { ...view, filterText } })}
          placeholder="Filtrar por título..."
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary text-sm outline-none focus:border-brand-cyan"
        />
        <select
          value={view.sortByProperty ?? ""}
          onChange={(e) =>
            updateViewConfig.mutate({
              baseId: base.id,
              viewConfig: { ...view, filterText, sortByProperty: e.target.value || undefined },
            })
          }
          className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
        >
          <option value="">Ordenar por...</option>
          {formulas.map((f) => (
            <option key={f.id} value={f.key}>
              {f.key}
            </option>
          ))}
        </select>
        <select
          value={view.sortDirection ?? "asc"}
          onChange={(e) =>
            updateViewConfig.mutate({
              baseId: base.id,
              viewConfig: { ...view, filterText, sortDirection: e.target.value as "asc" | "desc" },
            })
          }
          className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
        >
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-secondary-warm text-xs uppercase">
            <th className="pb-2">Página</th>
            {formulas.map((f) => (
              <th key={f.id} className="pb-2">
                {f.key}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.map((page) => (
            <tr key={page.id} className="border-t border-border">
              <td className="py-2 text-text-primary">{page.title}</td>
              {formulas.map((f) => (
                <td key={f.id} className="py-2 text-text-secondary-warm font-mono text-xs">
                  {evaluateForPage(page.id, f.expression)}
                </td>
              ))}
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={() => removePage.mutate(page.id)}
                  className="text-xs px-2 py-1 rounded-md border border-border text-text-secondary-warm hover:bg-surface-1"
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {addablePages.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Adicionar página...</option>
            {addablePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!selectedPageId) return;
              addPage.mutate(selectedPageId);
              setSelectedPageId("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <h4 className="font-sans text-sm font-semibold text-text-primary">Fórmulas</h4>
        {formulas.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-2 text-xs text-text-secondary-warm">
            <span>
              {f.key} = {f.expression}
            </span>
            <button
              type="button"
              onClick={() => deleteFormula.mutate(f.id)}
              className="px-2 py-1 rounded-md border border-error/40 text-error hover:bg-error-bg"
            >
              Remover
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={formulaKey}
            onChange={(e) => setFormulaKey(e.target.value)}
            placeholder="Nome (ex.: status)"
            className="w-32 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          />
          <input
            value={formulaExpression}
            onChange={(e) => setFormulaExpression(e.target.value)}
            placeholder='Expressão (ex.: IF(nota >= 7, "Aprovado", "Reprovado"))'
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          />
          <Button
            variant="secondary"
            onClick={() => {
              const key = formulaKey.trim();
              const expression = formulaExpression.trim();
              if (!key || !expression) return;
              createFormula.mutate({ key, expression });
              setFormulaKey("");
              setFormulaExpression("");
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
