import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { LIBRARY_ITEM_TYPE_LABELS } from "../service";
import {
  LIBRARY_COVER_MAX_SIZE_BYTES,
  LIBRARY_COVER_MIME_TYPES,
  type LibraryCoverChange,
  type LibraryItem,
  type LibraryItemEditInput,
  type LibraryItemType,
} from "../types";

export interface EditItemSubmit {
  input: LibraryItemEditInput;
  /** Ausente = manter a capa atual. */
  cover?: LibraryCoverChange;
  creators: string[];
}

/**
 * Edita os dados de um item já na estante. Separado do `NewItemForm` porque a criação gira em
 * torno da busca de metadados e da checagem de duplicados — aqui é só revisar campos.
 */
export function EditItemForm({
  item,
  creators,
  onSubmit,
  onCancel,
}: {
  item: LibraryItem;
  /** Nomes atuais, na ordem salva. */
  creators: string[];
  onSubmit: (changes: EditItemSubmit) => Promise<unknown>;
  onCancel: () => void;
}) {
  // Imagem enviada: `cover_url` em memória é um link assinado temporário, nunca um valor editável.
  const initialCoverUrl = item.cover_image_path ? "" : item.cover_url ?? "";
  const [title, setTitle] = useState(item.title);
  const [itemType, setItemType] = useState<LibraryItemType>(item.item_type);
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "");
  const [year, setYear] = useState(item.year ? String(item.year) : "");
  const [description, setDescription] = useState(item.description ?? "");
  const [creatorsText, setCreatorsText] = useState(creators.join(", "));
  const [originUrl, setOriginUrl] = useState(item.origin_url ?? "");
  const [tagsText, setTagsText] = useState(item.tags.join(", "));
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coverFile) {
      setFilePreviewUrl(null);
      return;
    }
    const preview = URL.createObjectURL(coverFile);
    setFilePreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [coverFile]);

  function handleCoverFile(file: File | undefined) {
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
    setRemoveCover(false);
  }

  function clearCoverFile() {
    setCoverFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function coverChange(): LibraryCoverChange | undefined {
    if (coverFile) return { file: coverFile };
    if (removeCover) return { url: null };
    const trimmed = coverUrl.trim();
    if (trimmed !== initialCoverUrl) return { url: trimmed || null };
    return undefined;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) return;
    const parsedYear = Number.parseInt(year.trim(), 10);
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        input: {
          title: trimmedTitle,
          itemType,
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined,
          originUrl: originUrl.trim() || undefined,
          tags: [...new Set(tagsText.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean))],
        },
        cover: coverChange(),
        creators: [...new Set(creatorsText.split(",").map((name) => name.trim()).filter(Boolean))],
      });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewSrc = removeCover ? null : filePreviewUrl ?? (coverUrl.trim() || (item.cover_image_path ? item.cover_url : null));
  const hasCover = Boolean(item.cover_image_path || item.cover_url || coverFile || coverUrl.trim());
  const labelClass = "text-[13px] font-medium text-fg-2";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-title" className={labelClass}>Título</label>
          <input id="library-edit-title" value={title} onChange={(event) => setTitle(event.target.value)} className="q-input" required maxLength={180} autoFocus />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-type" className={labelClass}>Tipo</label>
          <select id="library-edit-type" value={itemType} onChange={(event) => setItemType(event.target.value as LibraryItemType)} className="q-input">
            {Object.entries(LIBRARY_ITEM_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-subtitle" className={labelClass}>Subtítulo</label>
          <input id="library-edit-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="Edição, temporada ou complemento" className="q-input" />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-year" className={labelClass}>Ano</label>
          <input id="library-edit-year" type="number" min="0" max="3000" value={year} onChange={(event) => setYear(event.target.value)} className="q-input" />
        </div>
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="library-edit-description" className={labelClass}>Descrição</label>
        <textarea id="library-edit-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="q-input min-h-20 resize-y" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-creators" className={labelClass}>Autor / criador(es)</label>
          <input id="library-edit-creators" value={creatorsText} onChange={(event) => setCreatorsText(event.target.value)} placeholder="Separe por vírgulas" className="q-input" />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="library-edit-origin" className={labelClass}>Fonte ou link</label>
          <input id="library-edit-origin" type="url" value={originUrl} onChange={(event) => setOriginUrl(event.target.value)} placeholder="https://..." className="q-input" />
        </div>
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="library-edit-tags" className={labelClass}>Etiquetas</label>
        <input id="library-edit-tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="ficção, favoritos" className="q-input" />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface/45 p-3">
        <legend className="px-1 text-[11px] font-medium uppercase tracking-wider text-fg-3">Capa</legend>
        <div className="flex items-start gap-3">
          {previewSrc ? (
            <img src={previewSrc} alt={`Capa de ${title || item.title}`} className="h-20 w-14 shrink-0 rounded-md border border-line object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
          ) : (
            <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-[10px] text-fg-4">sem capa</span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              id="library-edit-cover-url"
              type="url"
              value={coverUrl}
              onChange={(event) => {
                setCoverUrl(event.target.value);
                setRemoveCover(false);
              }}
              disabled={Boolean(coverFile)}
              aria-label="URL da capa"
              placeholder={item.cover_image_path ? "Substituir por um link de imagem" : "https://.../capa.jpg"}
              className="q-input"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Enviar nova capa do dispositivo"
              onChange={(event) => handleCoverFile(event.currentTarget.files?.[0])}
              className="q-input file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-xs file:font-semibold file:text-fg"
            />
            <div className="flex flex-wrap gap-2">
              {coverFile && <Button type="button" variant="ghost" size="xs" onClick={clearCoverFile}>Desfazer imagem escolhida</Button>}
              {hasCover && !removeCover && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    clearCoverFile();
                    setCoverUrl("");
                    setRemoveCover(true);
                  }}
                >
                  Remover capa
                </Button>
              )}
              {removeCover && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setRemoveCover(false);
                    setCoverUrl(initialCoverUrl);
                  }}
                >
                  Manter capa
                </Button>
              )}
            </div>
          </div>
        </div>
        {coverError && <p role="alert" className="m-0 text-xs text-danger">{coverError}</p>}
      </fieldset>

      {saveError && <Notice tone="error" title="Não foi possível salvar as alterações">{saveError}</Notice>}

      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || isSaving || Boolean(coverError)}>
          {isSaving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
