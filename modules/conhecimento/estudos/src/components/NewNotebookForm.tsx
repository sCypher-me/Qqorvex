import { useState, type FormEvent } from "react";
import { Button, Input, Select, Textarea } from "@qqorvex/ui";
import type { NewNotebookInput, Notebook, NotebookType } from "../types";

const TYPES: { value: NotebookType; label: string }[] = [
  { value: "materia", label: "Matéria" },
  { value: "curso", label: "Curso" },
  { value: "certificacao", label: "Certificação" },
  { value: "preparacao_prova", label: "Preparação para prova" },
  { value: "tema_estudo", label: "Tema de estudo" },
  { value: "outro", label: "Outro" },
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (startDate && endDate && endDate < startDate) {
      setDateError("A data final precisa ser igual ou posterior à data inicial.");
      return;
    }
    setDateError("");
    onSave({
      name: trimmed,
      notebookType,
      area: area.trim() || undefined,
      tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
      description: description.trim() || undefined,
      institution: institution.trim() || undefined,
      instructor: instructor.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_190px] gap-3">
        <Input label="Nome do caderno" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Direito constitucional" autoFocus required />
        <Select label="Tipo" value={notebookType} onChange={(e) => setNotebookType(e.target.value as NotebookType)}>
          {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Contexto do estudo</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Área ou disciplina" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex.: Tecnologia" />
        <Input label="Instituição (opcional)" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex.: Alura" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Professor ou referência (opcional)" value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="Ex.: Prof. Ana" />
        <Input label="Tags (separe por vírgulas)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Ex.: prova, revisão, módulo 1" hint="Você poderá usar estas palavras para encontrar o caderno depois." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Começa em (opcional)" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateError(""); }} />
        <Input label="Prazo (opcional)" type="date" min={startDate || undefined} value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateError(""); }} error={dateError || undefined} />
      </div>
      <Textarea label="Intenção deste caderno" hint="Uma frase curta ajuda a Vex e você a retomarem o foco depois." value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que você quer dominar?" rows={3} />
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !name.trim()}>{isSubmitting ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Criar caderno"}</Button>
      </div>
    </form>
  );
}
