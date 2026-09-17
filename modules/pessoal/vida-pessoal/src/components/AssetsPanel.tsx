import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useWarranties } from "@qqorvex/module-documentos";
import { Button, ConfirmDialog, EmptyState, Input, Select } from "@qqorvex/ui";
import { useAssets, useCreateAsset, useDeleteAsset } from "../hooks/useVidaPratica";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Inventário mais amplo que Garantias (útil pra seguro/mudança) — vínculo opcional com uma garantia já cadastrada. */
export function AssetsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { assets, isLoading } = useAssets(client);
  const { warranties } = useWarranties(client);
  const createAsset = useCreateAsset(client, userId);
  const deleteAsset = useDeleteAsset(client);
  const [formOpen, setFormOpen] = useState(false);
  const [warrantyId, setWarrantyId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmAsset = assets.find((a) => a.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createAsset.mutate({
      name,
      category: String(form.get("category") ?? "").trim() || undefined,
      location: String(form.get("location") ?? "").trim() || undefined,
      estimatedValue: form.get("estimatedValue") ? Number(form.get("estimatedValue")) : undefined,
      warrantyId: warrantyId || undefined,
    });
    event.currentTarget.reset();
    setWarrantyId("");
  }

  return (
    <section className="qv-card p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-text-primary">Bens e inventário</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{assets.length}</span>}
      </div>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : assets.length === 0 ? (
        <EmptyState>Nenhum bem cadastrado.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {assets.map((asset) => {
            const details = [asset.category, asset.location].filter(Boolean).join(" · ");
            return (
              <li key={asset.id} className="qv-row-top flex items-center gap-2.5 py-2">
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[13px] text-text-primary">{asset.name}</span>
                  {details && <span className="text-xs text-text-muted">{details}</span>}
                </span>
                <span className="font-mono text-xs text-text-secondary">
                  {asset.estimated_value ? brl.format(asset.estimated_value) : "—"}
                </span>
                <button
                  type="button"
                  className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
                  aria-label={`Excluir "${asset.name}"`}
                  title="Excluir"
                  onClick={() => setConfirmDeleteId(asset.id)}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="qv-row-top pt-3 flex flex-col gap-2.5">
          <Input name="name" placeholder="Item" aria-label="Item" className="py-2 text-[13px]" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input name="category" placeholder="Categoria" aria-label="Categoria" className="py-2 text-[13px]" />
            <Input
              name="estimatedValue"
              type="number"
              placeholder="Valor estimado"
              aria-label="Valor estimado"
              className="py-2 text-[13px] font-mono"
            />
          </div>
          <Input name="location" placeholder="Onde está" aria-label="Onde está" className="py-2 text-[13px]" />
          {warranties.length > 0 && (
            <Select
              value={warrantyId}
              onChange={(e) => setWarrantyId(e.target.value)}
              aria-label="Garantia"
              className="py-2 text-[13px]"
            >
              <option value="">Garantia (opcional)</option>
              {warranties.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.product_name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">
              Adicionar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Fechar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="dashed" className="w-full" onClick={() => setFormOpen(true)}>
          Adicionar
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmAsset !== null}
        title={`Excluir "${confirmAsset?.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmAsset) deleteAsset.mutate(confirmAsset.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}
