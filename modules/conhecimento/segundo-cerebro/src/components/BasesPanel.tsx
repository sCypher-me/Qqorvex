import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, EmptyState } from "@qqorvex/ui";
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

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`;
}

const TABLE_HEADER_CLASS =
  "grid items-center gap-3 border-b border-border px-[18px] py-3 text-[11px] uppercase tracking-[0.08em] text-text-muted";
const TABLE_ROW_CLASS = "qv-row grid items-center gap-3 px-[18px] py-[13px]";

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

  const columns = "grid-cols-[2fr_2fr_1fr_auto]";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-[10px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da Base"
          aria-label="Nome da Base"
          className="qv-field max-w-[420px] flex-1 bg-surface-2"
        />
        <Button type="submit" variant="secondary">
          Criar Base
        </Button>
      </form>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : bases.length === 0 ? (
        <EmptyState>Nenhuma Base criada ainda. Uma Base agrupa páginas numa tabela com fórmulas.</EmptyState>
      ) : (
        <div className="qv-card overflow-hidden">
          <div className={`${TABLE_HEADER_CLASS} ${columns}`}>
            <span>Base</span>
            <span>Descrição</span>
            <span>Atualizada</span>
            <span className="sr-only">Ações</span>
          </div>
          {bases.map((base) => (
            <div
              key={base.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedBaseId(base.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelectedBaseId(base.id);
              }}
              className={`${TABLE_ROW_CLASS} ${columns} cursor-pointer outline-none transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.035]`}
            >
              <span className="truncate text-sm font-medium text-text-primary">{base.name}</span>
              <span className="truncate text-[13px] text-text-secondary">{base.description ?? "—"}</span>
              <span className="font-mono text-xs text-text-muted">{formatShortDate(base.updated_at)}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(base.id);
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                Excluir
              </Button>
            </div>
          ))}
        </div>
      )}
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

/** Resultado de fórmula: número em mono, texto (ex.: status) em pílula, erro em pílula vermelha. */
function FormulaValue({ value }: { value: string }) {
  if (value === "—") return <span className="font-mono text-xs text-text-muted">—</span>;
  if (value === "erro") return <span className="qv-pill qv-pill-danger justify-self-start">erro</span>;
  if (value.trim() !== "" && !Number.isNaN(Number(value))) {
    return <span className="font-mono text-xs text-text-secondary">{value}</span>;
  }
  return <span className="qv-pill max-w-full justify-self-start truncate">{value}</span>;
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

  const gridTemplate = { gridTemplateColumns: `2fr ${formulas.map(() => "1fr").join(" ")} 1fr auto`.replace(/\s+/g, " ") };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          ‹ Todas as Bases
        </Button>
        <span className="font-display text-lg font-semibold text-text-primary">{base.name}</span>
        <span className="flex-1" />
        <input
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
          }}
          onBlur={() => updateViewConfig.mutate({ baseId: base.id, viewConfig: { ...view, filterText } })}
          placeholder="Filtrar por título..."
          aria-label="Filtrar por título"
          className="qv-field w-[220px] py-2 text-[13px]"
        />
        <select
          value={view.sortByProperty ?? ""}
          onChange={(e) =>
            updateViewConfig.mutate({
              baseId: base.id,
              viewConfig: { ...view, filterText, sortByProperty: e.target.value || undefined },
            })
          }
          aria-label="Ordenar por"
          className="qv-field w-auto py-2 text-[13px]"
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
          aria-label="Direção da ordenação"
          className="qv-field w-auto py-2 text-[13px]"
        >
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      </div>

      <div className="qv-card overflow-x-auto">
        <div className="min-w-[560px]">
          <div className={TABLE_HEADER_CLASS} style={gridTemplate}>
            <span>Página</span>
            {formulas.map((f) => (
              <span key={f.id} className="truncate">
                {f.key}
              </span>
            ))}
            <span>Atualizada</span>
            <span className="sr-only">Ações</span>
          </div>
          {sorted.length === 0 ? (
            <p className="px-[18px] py-[13px] text-sm text-text-secondary">
              {memberPages.length === 0 ? "Nenhuma página nesta Base ainda." : "Nenhuma página corresponde ao filtro."}
            </p>
          ) : (
            sorted.map((page) => (
              <div key={page.id} className={TABLE_ROW_CLASS} style={gridTemplate}>
                <span className="truncate text-sm font-medium text-text-primary">{page.title}</span>
                {formulas.map((f) => (
                  <FormulaValue key={f.id} value={evaluateForPage(page.id, f.expression)} />
                ))}
                <span className="font-mono text-xs text-text-muted">{formatShortDate(page.updated_at)}</span>
                <Button type="button" variant="ghost" size="xs" onClick={() => removePage.mutate(page.id)}>
                  Remover
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {addablePages.length > 0 && (
        <div className="flex flex-wrap items-center gap-[10px]">
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            aria-label="Adicionar página"
            className="qv-field max-w-[420px] flex-1"
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

      <div className="qv-card flex flex-col gap-3 p-5">
        <span className="qv-section-label">Fórmulas</span>
        {formulas.length > 0 && (
          <div className="flex flex-col">
            {formulas.map((f) => (
              <div key={f.id} className="qv-row flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate font-mono text-xs text-text-secondary">
                  <span className="text-text-primary">{f.key}</span> = {f.expression}
                </span>
                <Button type="button" variant="ghost" size="xs" className="hover:!text-error" onClick={() => deleteFormula.mutate(f.id)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-[10px]">
          <input
            value={formulaKey}
            onChange={(e) => setFormulaKey(e.target.value)}
            placeholder="Nome (ex.: status)"
            aria-label="Nome da fórmula"
            className="qv-field w-40 py-2 text-[13px]"
          />
          <input
            value={formulaExpression}
            onChange={(e) => setFormulaExpression(e.target.value)}
            placeholder='Expressão (ex.: IF(nota >= 7, "Aprovado", "Reprovado"))'
            aria-label="Expressão da fórmula"
            className="qv-field min-w-[240px] flex-1 py-2 font-mono text-[13px]"
          />
          <Button
            variant="secondary"
            size="sm"
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
