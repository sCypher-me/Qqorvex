import { useState, type FormEvent } from "react";
import { Button, Select } from "@qqorvex/ui";
import { billingLimitMessage } from "@qqorvex/database";
import type { NewPageInput } from "../types";

export function NewPageForm({ onCreate, isCreating = false }: { onCreate: (input: NewPageInput) => Promise<unknown>; isCreating?: boolean }) {
  const [title, setTitle] = useState("");
  const [pageType, setPageType] = useState("nota");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError("");
    try {
      await onCreate({ title: trimmed, pageType });
      setTitle("");
    } catch (cause) {
      setError(billingLimitMessage(cause) ?? "Não foi possível criar agora. Seu título continua aqui; tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap items-end gap-[10px]" aria-label="Criar página">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capturar uma ideia..."
        aria-label="Título da nova página"
        className="q-input min-w-[180px] flex-1 bg-surface"
        maxLength={160}
      />
      <Select label="Formato" value={pageType} onChange={(event) => setPageType(event.target.value)} wrapperClassName="w-[140px]">
        <option value="nota">Nota</option>
        <option value="projeto">Projeto</option>
        <option value="mapa_mental">Mapa mental</option>
      </Select>
      <Button type="submit" variant="primary" disabled={!title.trim() || isCreating}>{isCreating ? "Criando…" : "Criar página"}</Button>
      {error && <span role="alert" className="basis-full text-xs text-danger">{error}</span>}
    </form>
  );
}
