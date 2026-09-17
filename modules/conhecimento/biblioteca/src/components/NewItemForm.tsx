import { useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { searchGoogleBooks, searchTmdb, type MetadataSearchResult } from "../metadataProviders";
import { findDuplicateItem } from "../service";
import { LIBRARY_ITEM_TYPE_LABELS, SEARCHABLE_ITEM_TYPES } from "../service";
import type { LibraryItem, LibraryItemType, NewLibraryItemInput } from "../types";

/**
 * "Captura manual exige apenas Título e Tipo; demais campos são opcionais ou enriquecidos depois."
 * Enriquecimento agora é possível de verdade pra livro/filme/série via Metadata Provider Layer
 * (docs/decisions/biblioteca-metadata-provider-design.md) — "Buscar" preenche subtítulo/descrição/
 * ano/capa/autores automaticamente; os outros 12 tipos continuam só manuais. Detecção de
 * duplicados (mesmo título normalizado + tipo) pede confirmação explícita antes de criar mesmo
 * assim — mesmo padrão de conflito já usado em Documentos/Agenda.
 */
export function NewItemForm({
  items,
  onCreate,
  tmdbApiKey = "",
}: {
  items: LibraryItem[];
  onCreate: (input: NewLibraryItemInput, creators?: { name: string; role: string }[]) => void;
  tmdbApiKey?: string;
}) {
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<LibraryItemType>("book");
  const [duplicate, setDuplicate] = useState<LibraryItem | null>(null);
  const [results, setResults] = useState<MetadataSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<MetadataSearchResult | null>(null);

  const isSearchable = SEARCHABLE_ITEM_TYPES.includes(itemType);

  function resetSearch() {
    setResults(null);
    setSelected(null);
  }

  async function handleSearch() {
    const query = title.trim();
    if (!query) return;
    setIsSearching(true);
    setResults(null);
    const found =
      itemType === "book"
        ? await searchGoogleBooks(query)
        : await searchTmdb(query, itemType === "movie" ? "movie" : "series", tmdbApiKey);
    setIsSearching(false);
    setResults(found);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = findDuplicateItem(items, trimmed, itemType);
    if (existing) {
      setDuplicate(existing);
      return;
    }
    submitItem(trimmed);
  }

  function submitItem(trimmedTitle: string) {
    const input: NewLibraryItemInput = selected
      ? {
          title: selected.title || trimmedTitle,
          itemType,
          subtitle: selected.subtitle,
          description: selected.description,
          year: selected.year,
          coverUrl: selected.coverUrl,
          originUrl: selected.originUrl,
        }
      : { title: trimmedTitle, itemType };
    onCreate(input, selected?.creators);
    setTitle("");
    setDuplicate(null);
    resetSearch();
  }

  function handleCreateAnyway() {
    submitItem(title.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[7px]">
        <label htmlFor="library-new-item-title" className="qv-field-label">
          Título
        </label>
        <input
          id="library-new-item-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDuplicate(null);
            resetSearch();
          }}
          placeholder="Livro, filme, série, curso..."
          className="qv-field"
        />
      </div>

      <div className="flex gap-2.5 items-end flex-wrap">
        <div className="flex flex-col gap-[7px] flex-1 min-w-[160px]">
          <label htmlFor="library-new-item-type" className="qv-field-label">
            Tipo
          </label>
          <select
            id="library-new-item-type"
            value={itemType}
            onChange={(e) => {
              setItemType(e.target.value as LibraryItemType);
              resetSearch();
            }}
            className="qv-field"
          >
            {Object.entries(LIBRARY_ITEM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {isSearchable && (
          <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching || !title.trim()}>
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        )}
        <Button type="submit" variant="primary">
          Adicionar
        </Button>
      </div>

      {results && (
        <div className="qv-well p-1.5 flex flex-col gap-0.5 max-h-72 overflow-auto">
          {results.length === 0 ? (
            <p className="text-sm text-text-secondary px-2.5 py-2">Nenhum resultado encontrado.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSelected(result);
                  setResults(null);
                }}
                className="flex items-center gap-3 text-left rounded-[10px] px-2.5 py-2 hover:bg-[rgba(255,255,255,.04)] transition-colors"
              >
                {result.coverUrl ? (
                  <img src={result.coverUrl} alt="" className="w-8 h-12 object-cover rounded-[6px] shrink-0" />
                ) : (
                  <span className="w-8 h-12 rounded-[6px] shrink-0 bg-surface-3" aria-hidden />
                )}
                <span className="text-sm text-text-primary min-w-0">
                  {result.title}
                  {result.year ? <span className="font-mono text-xs text-text-muted ml-1.5">{result.year}</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="qv-tile p-2.5 flex items-center gap-3 border-vex-cyan-dark">
          {selected.coverUrl && <img src={selected.coverUrl} alt="" className="w-8 h-12 object-cover rounded-[6px] shrink-0" />}
          <span className="text-[13px] leading-normal text-text-secondary flex-1 min-w-0">
            Metadados de <span className="text-text-primary">"{selected.title}"</span> serão preenchidos automaticamente.
          </span>
          <Button type="button" variant="quiet" size="xs" onClick={() => setSelected(null)}>
            Remover
          </Button>
        </div>
      )}

      {duplicate && (
        <Notice
          tone="warning"
          title="Item duplicado"
          actions={
            <>
              <Button type="button" variant="secondary" size="sm" onClick={handleCreateAnyway}>
                Adicionar mesmo assim
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDuplicate(null)}>
                Cancelar
              </Button>
            </>
          }
        >
          Já existe um item chamado "{duplicate.title}" desse mesmo tipo.
        </Notice>
      )}
    </form>
  );
}
