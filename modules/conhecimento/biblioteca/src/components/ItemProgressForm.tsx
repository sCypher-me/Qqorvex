import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import type { LibraryItem } from "../types";

type ProgressInput = { current: number; total?: number; mode: "numerico" | "percentual"; unit?: string };

const DEFAULT_UNITS: Partial<Record<LibraryItem["item_type"], string>> = {
  book: "páginas",
  comic: "páginas",
  manga: "capítulos",
  series: "episódios",
  anime: "episódios",
  podcast: "minutos",
  podcast_episode: "minutos",
  video: "minutos",
  course: "aulas",
  academic_paper: "seções",
};

export function ItemProgressForm({ item, isSaving, onSave }: { item: LibraryItem; isSaving: boolean; onSave: (progress: ProgressInput) => Promise<unknown> }) {
  const [mode, setMode] = useState<ProgressInput["mode"]>(item.progress_mode === "numerico" ? "numerico" : "percentual");
  const [current, setCurrent] = useState(item.progress_current === null ? "0" : String(item.progress_current));
  const [total, setTotal] = useState(item.progress_total === null ? "" : String(item.progress_total));
  const [unit, setUnit] = useState(item.progress_unit ?? DEFAULT_UNITS[item.item_type] ?? "unidades");
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(item.progress_mode === "numerico" ? "numerico" : "percentual");
    setCurrent(item.progress_current === null ? "0" : String(item.progress_current));
    setTotal(item.progress_total === null ? "" : String(item.progress_total));
    setUnit(item.progress_unit ?? DEFAULT_UNITS[item.item_type] ?? "unidades");
    setError("");
  }, [item.id, item.progress_mode, item.progress_current, item.progress_total, item.progress_unit, item.item_type]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const currentValue = Number(current);
    const totalValue = Number(total);
    if (!Number.isFinite(currentValue) || currentValue < 0) {
      setError("Informe um progresso válido, igual ou maior que zero.");
      return;
    }
    if (mode === "percentual" && currentValue > 100) {
      setError("O percentual deve ficar entre 0 e 100.");
      return;
    }
    if (mode === "numerico" && (!Number.isFinite(totalValue) || totalValue <= 0 || currentValue > totalValue)) {
      setError("Informe um total maior que zero e não menor que o progresso atual.");
      return;
    }
    setError("");
    try {
      await onSave({ current: currentValue, mode, total: mode === "numerico" ? totalValue : undefined, unit: mode === "numerico" ? unit.trim() || undefined : undefined });
    } catch {
      setError("Não foi possível salvar o progresso. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="qv-well flex flex-col gap-3 p-4">
      <div>
        <h3 className="m-0 text-sm font-semibold text-text-primary">Seu progresso</h3>
        <p className="m-0 mt-1 text-xs text-text-muted">Registre páginas, episódios, aulas ou um percentual.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">Formato
          <select value={mode} onChange={(event) => setMode(event.target.value as ProgressInput["mode"])} className="qv-field py-2 text-sm">
            <option value="numerico">Atual / total</option>
            <option value="percentual">Percentual</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">{mode === "percentual" ? "Concluído (%)" : "Atual"}
          <input type="number" min="0" max={mode === "percentual" ? "100" : total || undefined} step={mode === "percentual" ? "1" : "any"} required value={current} onChange={(event) => setCurrent(event.target.value)} className="qv-field py-2 text-sm" />
        </label>
        {mode === "numerico" && <>
          <label className="flex flex-col gap-1.5 text-xs text-text-secondary">Total
            <input type="number" min="0.01" step="any" required value={total} onChange={(event) => setTotal(event.target.value)} className="qv-field py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-secondary">Unidade
            <input value={unit} maxLength={24} onChange={(event) => setUnit(event.target.value)} placeholder="páginas, episódios..." className="qv-field py-2 text-sm" />
          </label>
        </>}
      </div>
      {error && <span role="alert" className="text-xs text-error">{error}</span>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>{isSaving ? "Salvando…" : "Salvar progresso"}</Button>
      </div>
    </form>
  );
}
