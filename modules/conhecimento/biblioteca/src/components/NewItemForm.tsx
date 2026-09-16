import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDuplicate(null);
            resetSearch();
          }}
          placeholder="Título do item (livro, filme, curso...)"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <select
          value={itemType}
          onChange={(e) => {
            setItemType(e.target.value as LibraryItemType);
            resetSearch();
          }}
          className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary"
        >
          {Object.entries(LIBRARY_ITEM_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
        <div className="flex flex-col gap-1">
          {results.length === 0 ? (
            <p className="font-sans text-sm text-text-secondary-warm">Nenhum resultado encontrado.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSelected(result);
                  setResults(null);
                }}
                className="flex items-center gap-2 text-left bg-surface-2 border border-border rounded-md p-2 hover:border-brand-cyan"
              >
                {result.coverUrl && <img src={result.coverUrl} alt="" className="w-8 h-12 object-cover rounded-sm" />}
                <span className="font-sans text-sm text-text-primary">
                  {result.title} {result.year ? `(${result.year})` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="flex items-center gap-2 bg-surface-2 border border-brand-cyan rounded-md p-2">
          {selected.coverUrl && <img src={selected.coverUrl} alt="" className="w-8 h-12 object-cover rounded-sm" />}
          <span className="font-sans text-sm text-text-primary flex-1">
            Metadados de "{selected.title}" serão preenchidos automaticamente.
          </span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
          >
            Remover
          </button>
        </div>
      )}

      {duplicate && (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex flex-col gap-2">
          <p className="text-sm text-warning">Já existe um item chamado "{duplicate.title}" desse mesmo tipo.</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleCreateAnyway}>
              Adicionar mesmo assim
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDuplicate(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
