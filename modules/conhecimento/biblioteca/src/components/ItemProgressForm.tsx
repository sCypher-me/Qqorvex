import { useEffect, useState, type FormEvent } from "react";
import { MinusIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { Button, IconButton, ProgressBar, Segmented } from "@qqorvex/ui";
import { computeProgressPercent } from "../service";
import type { LibraryItem } from "../types";

type ProgressInput = { current: number; total?: number; mode: "numerico" | "percentual"; unit?: string };

export const DEFAULT_PROGRESS_UNITS: Partial<Record<LibraryItem["item_type"], string>> = {
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

/**
 * Progresso do item: − / + para o passo a passo (página, episódio, aula) e edição completa
 * (atual, total, unidade ou percentual). Cada ajuste salva na hora.
 */
export function ItemProgressForm({ item, isSaving, onSave }: { item: LibraryItem; isSaving: boolean; onSave: (progress: ProgressInput) => Promise<unknown> }) {
  const hasProgress = item.progress_current !== null && (item.progress_mode === "percentual" || Boolean(item.progress_total));
  const [editing, setEditing] = useState(!hasProgress);
  const [mode, setMode] = useState<ProgressInput["mode"]>(item.progress_mode === "percentual" ? "percentual" : "numerico");
  const [current, setCurrent] = useState(String(item.progress_current ?? 0));
  const [total, setTotal] = useState(item.progress_total === null ? "" : String(item.progress_total));
  const [unit, setUnit] = useState(item.progress_unit ?? DEFAULT_PROGRESS_UNITS[item.item_type] ?? "unidades");
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(item.progress_mode === "percentual" ? "percentual" : "numerico");
    setCurrent(String(item.progress_current ?? 0));
    setTotal(item.progress_total === null ? "" : String(item.progress_total));
    setUnit(item.progress_unit ?? DEFAULT_PROGRESS_UNITS[item.item_type] ?? "unidades");
    setError("");
  }, [item.id, item.progress_mode, item.progress_current, item.progress_total, item.progress_unit, item.item_type]);

  const percent = computeProgressPercent(item);

  async function save(next: ProgressInput) {
    try {
      setError("");
      await onSave(next);
      return true;
    } catch {
      setError("Não foi possível salvar o progresso. Tente de novo.");
      return false;
    }
  }

  function step(delta: number) {
    const base = item.progress_current ?? 0;
    if (item.progress_mode === "percentual") {
      void save({ mode: "percentual", current: Math.min(100, Math.max(0, base + delta * 5)) });
      return;
    }
    const max = item.progress_total ?? Infinity;
    void save({ mode: "numerico", current: Math.min(max, Math.max(0, base + delta)), total: item.progress_total ?? undefined, unit: item.progress_unit ?? undefined });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const currentValue = Number(current);
    const totalValue = Number(total);
    if (!Number.isFinite(currentValue) || currentValue < 0) return setError("Informe um progresso igual ou maior que zero.");
    if (mode === "percentual" && currentValue > 100) return setError("O percentual vai de 0 a 100.");
    if (mode === "numerico" && (!Number.isFinite(totalValue) || totalValue <= 0 || currentValue > totalValue)) return setError("O total precisa ser maior que zero e não menor que o atual.");
    const ok = await save({ current: currentValue, mode, total: mode === "numerico" ? totalValue : undefined, unit: mode === "numerico" ? unit.trim() || undefined : undefined });
    if (ok) setEditing(false);
  }

  if (!editing && hasProgress) {
    const label = item.progress_mode === "percentual" ? `${item.progress_current}%` : `${item.progress_current} de ${item.progress_total}${item.progress_unit ? ` ${item.progress_unit}` : ""}`;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <IconButton label="Voltar um" variant="secondary" size="md" onClick={() => step(-1)} disabled={isSaving || (item.progress_current ?? 0) <= 0}>
            <MinusIcon weight="bold" />
          </IconButton>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[15px] font-semibold tabular-nums text-fg">{label}</p>
            {percent !== null && item.progress_mode !== "percentual" && <p className="text-xs text-fg-3">{percent}%</p>}
          </div>
          <IconButton label="Avançar um" variant="secondary" size="md" onClick={() => step(1)} disabled={isSaving || (percent ?? 0) >= 100}>
            <PlusIcon weight="bold" />
          </IconButton>
        </div>
        <ProgressBar value={percent ?? 0} height={5} label="Progresso" />
        <div className="flex items-center justify-between">
          {error ? <span role="alert" className="text-xs text-danger">{error}</span> : <span />}
          <Button variant="ghost" size="xs" leadingIcon={<PencilSimpleIcon size={12} />} onClick={() => setEditing(true)}>
            Ajustar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
      <Segmented
        label="Formato do progresso"
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "numerico", label: "Atual / total" },
          { value: "percentual", label: "Percentual" },
        ]}
      />
      {mode === "percentual" ? (
        <label className="flex items-center gap-3 text-[13px] text-fg-2">
          <input type="range" min={0} max={100} step={5} value={Number(current) || 0} onChange={(event) => setCurrent(event.target.value)} className="flex-1 accent-[var(--q-gold)]" aria-label="Percentual concluído" />
          <span className="w-10 text-right tabular-nums text-fg">{Number(current) || 0}%</span>
        </label>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs text-fg-3">
            Atual
            <input type="number" min={0} step="any" value={current} onChange={(event) => setCurrent(event.target.value)} data-size="sm" className="q-input" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-fg-3">
            Total
            <input type="number" min={1} step="any" value={total} onChange={(event) => setTotal(event.target.value)} data-size="sm" className="q-input" placeholder="320" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-fg-3">
            Unidade
            <input value={unit} maxLength={24} onChange={(event) => setUnit(event.target.value)} data-size="sm" className="q-input" />
          </label>
        </div>
      )}
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
      <div className="flex justify-end gap-2">
        {hasProgress && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="secondary" size="sm" loading={isSaving}>
          Salvar progresso
        </Button>
      </div>
    </form>
  );
}
