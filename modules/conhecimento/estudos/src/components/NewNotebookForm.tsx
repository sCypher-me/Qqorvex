import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Input, Notice, Select, Textarea, cx } from "@qqorvex/ui";
import type { NewNotebookInput, Notebook, NotebookCoverTheme, NotebookType } from "../types";
import { NOTEBOOK_COVER_STICKERS, NOTEBOOK_COVER_THEMES, NotebookCoverArtwork } from "./NotebookCover";

const TYPES: { value: NotebookType; label: string }[] = [
  { value: "materia", label: "Matéria" }, { value: "curso", label: "Curso" }, { value: "certificacao", label: "Certificação" },
  { value: "preparacao_prova", label: "Preparação para prova" }, { value: "tema_estudo", label: "Tema de estudo" }, { value: "outro", label: "Outro" },
];

export function NewNotebookForm({ onSave, onCancel, isSubmitting = false, initialNotebook, mode = "create" }: { onSave: (input: NewNotebookInput) => void; onCancel?: () => void; isSubmitting?: boolean; initialNotebook?: Notebook; mode?: "create" | "edit" }) {
  const [name, setName] = useState(() => initialNotebook?.name ?? "");
  const [notebookType, setNotebookType] = useState<NotebookType>(() => initialNotebook?.notebook_type ?? "materia");
  const [area, setArea] = useState(() => initialNotebook?.area ?? "");
  const [description, setDescription] = useState(() => initialNotebook?.description ?? "");
  const [institution, setInstitution] = useState(() => initialNotebook?.institution ?? "");
  const [instructor, setInstructor] = useState(() => initialNotebook?.instructor ?? "");
  const [tagsText, setTagsText] = useState(() => initialNotebook?.tags.join(", ") ?? "");
  const [startDate, setStartDate] = useState(() => initialNotebook?.start_date ?? "");
  const [endDate, setEndDate] = useState(() => initialNotebook?.end_date ?? "");
  const [dateError, setDateError] = useState("");
  const [coverTheme, setCoverTheme] = useState<NotebookCoverTheme>(() => initialNotebook?.cover_theme ?? "gold");
  const [coverStickers, setCoverStickers] = useState<string[]>(() => initialNotebook?.cover_stickers ?? ["✨"]);
  const [coverFile, setCoverFile] = useState<File | null | undefined>(undefined);
  const [coverFileError, setCoverFileError] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverImageUrl = localPreview ?? (coverFile === null ? null : initialNotebook?.cover_image_url ?? null);

  useEffect(() => {
    if (!(coverFile instanceof File)) { setLocalPreview(null); return; }
    const url = URL.createObjectURL(coverFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  function toggleSticker(sticker: string) {
    setCoverStickers((current) => current.includes(sticker) ? current.filter((item) => item !== sticker) : current.length < 4 ? [...current, sticker] : current);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (startDate && endDate && endDate < startDate) { setDateError("A data final precisa ser igual ou posterior à data inicial."); return; }
    setDateError("");
    onSave({
      name: trimmed, notebookType, area: area.trim() || undefined, tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
      description: description.trim() || undefined, institution: institution.trim() || undefined, instructor: instructor.trim() || undefined,
      startDate: startDate || undefined, endDate: endDate || undefined, coverTheme, coverStickers, coverImage: coverFile,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border border-line-soft bg-surface-0 p-3" aria-label="Personalização da capa">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-fg">Capa do caderno</h3><p className="text-xs text-fg-3">Escolha uma cor, adesivos e, se quiser, uma foto.</p></div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return;
            if (!(file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) { setCoverFileError("Escolha uma imagem PNG, JPG ou WebP."); return; }
            if (file.size <= 0 || file.size > 5 * 1024 * 1024) { setCoverFileError("A imagem deve ter até 5 MB."); return; }
            setCoverFileError(""); setCoverFile(file);
          }} />
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="xs" variant="secondary" onClick={() => fileInput.current?.click()}>{coverImageUrl ? "Trocar imagem" : "Adicionar imagem"}</Button>
            {coverImageUrl && <Button type="button" size="xs" variant="ghost" onClick={() => { setCoverFile(null); setLocalPreview(null); setCoverFileError(""); }}>Remover</Button>}
          </div>
        </div>
        {coverFileError && <Notice compact tone="error">{coverFileError}</Notice>}
        <NotebookCoverArtwork title={name || "Novo caderno"} subtitle={[area || "Matéria", institution].filter(Boolean).join(" · ")} theme={coverTheme} stickers={coverStickers} imageUrl={coverImageUrl} className="h-[190px]" />
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-fg-2">Estilo da capa</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {NOTEBOOK_COVER_THEMES.map((theme) => (
              <button key={theme.id} type="button" aria-pressed={coverTheme === theme.id} onClick={() => setCoverTheme(theme.id)} className={cx("flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition-colors", coverTheme === theme.id ? "border-gold-line bg-gold-soft text-fg" : "border-line-soft text-fg-2 hover:bg-hover")}>
                <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/15" style={{ backgroundColor: theme.accent }} />
                <span className="truncate">{theme.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-fg-2">Adesivos <span className="font-normal text-fg-4">· até 4</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {NOTEBOOK_COVER_STICKERS.map((sticker) => (
              <button key={sticker} type="button" aria-label={`Adesivo ${sticker}`} aria-pressed={coverStickers.includes(sticker)} onClick={() => toggleSticker(sticker)} className={cx("grid h-9 w-9 place-items-center rounded-lg border text-lg transition-colors", coverStickers.includes(sticker) ? "border-gold-line bg-gold-soft" : "border-line-soft hover:bg-hover")}>
                {sticker}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <Input label="Nome do caderno" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Direito constitucional" autoFocus required maxLength={80} />
        <Select label="Tipo" value={notebookType} onChange={(event) => setNotebookType(event.target.value as NotebookType)}>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Contexto do estudo</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Área ou disciplina" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Ex.: Tecnologia" />
        <Input label="Instituição (opcional)" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Ex.: Alura" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Professor ou referência (opcional)" value={instructor} onChange={(event) => setInstructor(event.target.value)} placeholder="Ex.: Prof. Ana" />
        <Input label="Tags (separe por vírgulas)" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Ex.: prova, revisão, módulo 1" hint="Você poderá usar estas palavras para encontrar o caderno depois." />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Começa em (opcional)" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setDateError(""); }} />
        <Input label="Prazo (opcional)" type="date" min={startDate || undefined} value={endDate} onChange={(event) => { setEndDate(event.target.value); setDateError(""); }} error={dateError || undefined} />
      </div>
      <Textarea label="Intenção deste caderno" hint="Uma frase curta ajuda a Vex e você a retomarem o foco depois." value={description} onChange={(event) => setDescription(event.target.value)} placeholder="O que você quer dominar?" rows={3} />
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !name.trim()}>{isSubmitting ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Criar caderno"}</Button>
      </div>
    </form>
  );
}
