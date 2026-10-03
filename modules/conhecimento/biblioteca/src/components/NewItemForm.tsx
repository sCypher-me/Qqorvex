import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { searchLibraryMetadata, type MetadataSearchResult } from "../metadataProviders";
import { findDuplicateItem } from "../service";
import { LIBRARY_ITEM_TYPE_LABELS, SEARCHABLE_ITEM_TYPES } from "../service";
import { LIBRARY_COVER_MAX_SIZE_BYTES, LIBRARY_COVER_MIME_TYPES, type LibraryItem, type LibraryItemType, type NewLibraryItemInput } from "../types";

/**
 * "Captura manual exige apenas Título e Tipo; demais campos são opcionais ou enriquecidos depois."
 * Enriquecimento agora é possível de verdade pra livro/filme/série via Metadata Provider Layer
 * — "Buscar" preenche subtítulo/descrição/
 * ano/capa/autores automaticamente; os outros tipos podem receber detalhes manualmente. Detecção de
 * duplicados (mesmo título normalizado + tipo) pede confirmação explícita antes de criar mesmo
 * assim — mesmo padrão de conflito já usado em Documentos/Agenda.
 */
export function NewItemForm({
  items,
  onCreate,
  isCreating = false,
  tmdbApiKey = "",
}: {
  items: LibraryItem[];
  onCreate: (input: NewLibraryItemInput, creators?: { name: string; role: string }[], coverFile?: File) => Promise<unknown>;
  isCreating?: boolean;
  tmdbApiKey?: string;
}) {
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<LibraryItemType>("book");
  const [duplicate, setDuplicate] = useState<LibraryItem | null>(null);
  const [results, setResults] = useState<MetadataSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<MetadataSearchResult | null>(null);
  const [manualDetailsOpen, setManualDetailsOpen] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [originUrl, setOriginUrl] = useState("");
  const [creatorsText, setCreatorsText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isSearchable = SEARCHABLE_ITEM_TYPES.includes(itemType);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const preview = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [coverFile]);

  function handleCoverChange(file: File | undefined) {
    setCoverError(null);
    if (!file) return;
    if (!(LIBRARY_COVER_MIME_TYPES as readonly string[]).includes(file.type)) {
      setCoverError("Use uma imagem PNG, JPG ou WebP.");
      return;
    }
    if (file.size <= 0 || file.size > LIBRARY_COVER_MAX_SIZE_BYTES) {
      setCoverError("A capa precisa ter até 5 MB.");
      return;
    }
    setCoverFile(file);
  }

  function clearCoverFile() {
    setCoverFile(null);
    if (coverFileInputRef.current) coverFileInputRef.current.value = "";
  }

  function resetSearch() {
    setResults(null);
    setSelected(null);
    setSearchError(null);
    setSubtitle("");
    setDescription("");
    setYear("");
    setCoverUrl("");
    setOriginUrl("");
    setCreatorsText("");
    setTagsText("");
    setManualDetailsOpen(false);
  }

  async function handleSearch() {
    const query = title.trim();
    if (!query) return;
    setIsSearching(true);
    setResults(null);
    setSearchError(null);
    if ((itemType === "movie" || itemType === "series" || itemType === "anime") && !tmdbApiKey) {
      setSearchError("Busca de filmes e séries indisponível: configure VITE_TMDB_API_KEY. Você ainda pode preencher os detalhes manualmente.");
      setIsSearching(false);
      return;
    }
    try {
      setResults(await searchLibraryMetadata(query, itemType, tmdbApiKey));
    } catch {
      setSearchError("Não foi possível buscar os metadados agora. Você ainda pode preencher tudo manualmente.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = findDuplicateItem(items, trimmed, itemType);
    if (existing) {
      setDuplicate(existing);
      return;
    }
    await submitItem(trimmed);
  }

  async function submitItem(trimmedTitle: string) {
    const parsedYear = Number.parseInt(year.trim(), 10);
    const parsedCreators = creatorsText
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, role: "criador" }));
    const selectedCreatorText = selected?.creators?.map((creator) => creator.name).join(", ") ?? "";
    const creators = selected && creatorsText.trim() === selectedCreatorText ? selected.creators : parsedCreators;
    const tags = [...new Set(tagsText.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean))];
    const input: NewLibraryItemInput = {
      title: selected?.title || trimmedTitle,
      itemType,
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined,
      coverUrl: coverFile ? undefined : coverUrl.trim() || undefined,
      originUrl: originUrl.trim() || undefined,
      tags,
    };
    setSaveError(null);
    try {
      await onCreate(input, creators && creators.length > 0 ? creators : undefined, coverFile ?? undefined);
      setTitle("");
      clearCoverFile();
      setCoverError(null);
      setDuplicate(null);
      resetSearch();
    } catch {
      setSaveError("O item não foi salvo. Seus dados continuam no formulário para tentar novamente.");
    }
  }

  function selectResult(result: MetadataSearchResult) {
    setSelected(result);
    setSubtitle(result.subtitle ?? "");
    setDescription(result.description ?? "");
    setYear(result.year ? String(result.year) : "");
    setCoverUrl(result.coverUrl ?? "");
    setOriginUrl(result.originUrl ?? "");
    setCreatorsText(result.creators?.map((creator) => creator.name).join(", ") ?? "");
    setManualDetailsOpen(true);
    setResults(null);
  }

  async function handleCreateAnyway() {
    await submitItem(title.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[7px]">
        <label htmlFor="library-new-item-title" className="text-[13px] font-medium text-fg-2">
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
          className="q-input"
          required
          maxLength={180}
        />
      </div>

      <div className="flex gap-2.5 items-end flex-wrap">
        <div className="flex flex-col gap-[7px] flex-1 min-w-[160px]">
          <label htmlFor="library-new-item-type" className="text-[13px] font-medium text-fg-2">
            Tipo
          </label>
          <select
            id="library-new-item-type"
            value={itemType}
            onChange={(e) => {
              setItemType(e.target.value as LibraryItemType);
              resetSearch();
            }}
            className="q-input"
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
          <Button type="submit" variant="primary" disabled={isCreating || !title.trim() || Boolean(coverError)}>
            {isCreating ? "Salvando…" : "Adicionar"}
        </Button>
      </div>

      {results && (
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 p-1.5 flex flex-col gap-0.5 max-h-72 overflow-auto">
          {results.length === 0 ? (
            <p className="text-sm text-fg-2 px-2.5 py-2">Nenhum resultado encontrado.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectResult(result)}
                className="flex items-center gap-3 text-left rounded-[10px] px-2.5 py-2 hover:bg-hover transition-colors"
              >
                {result.coverUrl ? (
                  <img src={result.coverUrl} alt="" className="w-8 h-12 object-cover rounded-[6px] shrink-0" />
                ) : (
                  <span className="w-8 h-12 rounded-[6px] shrink-0 bg-raised" aria-hidden />
                )}
                <span className="text-sm text-fg min-w-0">
                  {result.title}
                  {result.year ? <span className="font-mono text-xs text-fg-3 ml-1.5">{result.year}</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {searchError && <p role="alert" className="m-0 text-xs text-gold-fg">{searchError}</p>}

      {selected && (
        <div className="min-w-0 rounded-lg border border-line bg-raised transition-colors hover:border-line-strong p-2.5 flex items-center gap-3 border-gold-line">
          {selected.coverUrl && <img src={selected.coverUrl} alt="" className="w-8 h-12 object-cover rounded-[6px] shrink-0" />}
          <span className="text-[13px] leading-normal text-fg-2 flex-1 min-w-0">
            Metadados de <span className="text-fg">"{selected.title}"</span> foram encontrados. Você pode revisar ou editar os campos abaixo.
          </span>
          <Button type="button" variant="ghost" size="xs" onClick={resetSearch}>
            Limpar
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-fg-3">Metadados opcionais</span>
            <p className="m-0 mt-1 text-xs text-fg-2">Adicione capa, descrição e outros detalhes manualmente.</p>
          </div>
          <Button type="button" variant="ghost" size="xs" onClick={() => setManualDetailsOpen((open) => !open)}>
            {manualDetailsOpen ? "Ocultar" : "Adicionar"}
          </Button>
        </div>

        {manualDetailsOpen && (
          <div className="mt-3 grid gap-3 border-t border-line/70 pt-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="library-new-item-subtitle" className="text-[13px] font-medium text-fg-2">Subtítulo</label>
                <input id="library-new-item-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Edição, temporada ou complemento" className="q-input" />
              </div>
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="library-new-item-year" className="text-[13px] font-medium text-fg-2">Ano</label>
                <input id="library-new-item-year" type="number" min="0" max="3000" value={year} onChange={(event) => setYear(event.target.value)} placeholder="2026" className="q-input" />
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="library-new-item-description" className="text-[13px] font-medium text-fg-2">Descrição</label>
              <textarea id="library-new-item-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Uma breve descrição do item" rows={3} className="q-input min-h-20 resize-y" />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="library-new-item-cover" className="text-[13px] font-medium text-fg-2">URL da capa</label>
              <input id="library-new-item-cover" type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://.../capa.jpg" className="q-input" />
              <span className="text-[11px] text-fg-3">Você também pode buscar uma capa automaticamente para livros, filmes, séries e animes.</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="library-new-item-cover-file" className="text-[13px] font-medium text-fg-2">Ou escolha uma capa do dispositivo</label>
                <input
                  id="library-new-item-cover-file"
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleCoverChange(event.currentTarget.files?.[0])}
                  className="q-input file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-xs file:font-semibold file:text-fg"
                />
                <span className="text-[11px] text-fg-3">PNG, JPG ou WebP · até 5 MB · salva em privado na sua conta.</span>
              </div>
              {coverFile && <Button type="button" variant="ghost" size="sm" onClick={clearCoverFile}>Remover imagem</Button>}
            </div>
            {coverError && <p role="alert" className="m-0 text-xs text-danger">{coverError}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="library-new-item-creators" className="text-[13px] font-medium text-fg-2">Autor / criador(es)</label>
                <input id="library-new-item-creators" value={creatorsText} onChange={(event) => setCreatorsText(event.target.value)} placeholder="Separe por vírgulas" className="q-input" />
              </div>
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="library-new-item-origin" className="text-[13px] font-medium text-fg-2">Fonte ou link</label>
                <input id="library-new-item-origin" type="url" value={originUrl} onChange={(event) => setOriginUrl(event.target.value)} placeholder="https://..." className="q-input" />
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="library-new-item-tags" className="text-[13px] font-medium text-fg-2">Etiquetas</label>
              <input id="library-new-item-tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="ficção, favoritos, para pesquisar" className="q-input" />
              <span className="text-[11px] text-fg-3">Separe por vírgulas ou ponto e vírgula; elas também serão pesquisáveis.</span>
            </div>
            {(coverPreviewUrl || coverUrl.trim()) && <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex items-center gap-3 p-3">
              <img src={coverPreviewUrl ?? coverUrl.trim()} alt={`Prévia da capa de ${title || "novo item"}`} className="h-20 w-14 rounded-md border border-line object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              <div className="min-w-0"><span className="block text-xs font-medium text-fg">Prévia da capa</span>{coverFile && <span className="mt-1 block truncate text-[11px] text-fg-3">{coverFile.name}</span>}</div>
            </div>}
          </div>
        )}
      </div>

      {duplicate && (
        <Notice
          tone="warning"
          title="Item duplicado"
          actions={
            <>
              <Button type="button" variant="secondary" size="sm" disabled={isCreating} onClick={() => void handleCreateAnyway()}>
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
      {saveError && <Notice tone="error" title="Não foi possível salvar o item">{saveError}</Notice>}
    </form>
  );
}
