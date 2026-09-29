import { useState, type FormEvent } from "react";
import { PackageIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useWarranties } from "@qqorvex/module-documentos";
import { Button, ConfirmDialog, Input, Select, SkeletonList } from "@qqorvex/ui";
import { useAssets, useCreateAsset, useDeleteAsset } from "../hooks/useVidaPratica";
import { PanelEmpty, PanelRow, PanelShell, brl } from "./PanelShell";

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
  const totalValue = assets.reduce((sum, asset) => sum + (asset.estimated_value ?? 0), 0);
  const warrantyName = new Map(warranties.map((warranty) => [warranty.id, warranty.product_name]));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createAsset.mutate(
      {
        name,
        category: String(form.get("category") ?? "").trim() || undefined,
        location: String(form.get("location") ?? "").trim() || undefined,
        estimatedValue: form.get("estimatedValue") ? Number(form.get("estimatedValue")) : undefined,
        warrantyId: warrantyId || undefined,
      },
      {
        onSuccess: () => {
          formElement.reset();
          setWarrantyId("");
          setFormOpen(false);
        },
      },
    );
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input name="name" placeholder="Item (ex.: notebook, geladeira)" aria-label="Item" fieldSize="sm" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <Input name="category" placeholder="Categoria" aria-label="Categoria" fieldSize="sm" />
        <Input name="location" placeholder="Onde está" aria-label="Onde está" fieldSize="sm" />
        <Input name="estimatedValue" type="number" min={0} step="0.01" placeholder="Valor estimado (R$)" aria-label="Valor estimado" fieldSize="sm" />
        {warranties.length > 0 && (
          <Select value={warrantyId} onChange={(event) => setWarrantyId(event.target.value)} aria-label="Garantia" fieldSize="sm">
            <option value="">Sem garantia</option>
            {warranties.map((warranty) => (
              <option key={warranty.id} value={warranty.id}>
                {warranty.product_name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Button type="submit" size="sm" className="self-start" loading={createAsset.isPending}>
        Salvar bem
      </Button>
      {createAsset.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar o bem; os campos continuam preenchidos.</p>}
    </form>
  );

  return (
    <PanelShell
      icon={<PackageIcon />}
      title="Bens e inventário"
      meta={isLoading ? undefined : assets.length || undefined}
      summary={assets.length && totalValue ? `${brl.format(totalValue)} em valor estimado` : "Útil para seguro, mudança e declaração"}
      addLabel="Adicionar bem"
      formOpen={formOpen}
      onToggleForm={() => setFormOpen((value) => !value)}
      form={form}
    >
      {isLoading ? (
        <SkeletonList rows={2} />
      ) : assets.length === 0 ? (
        <PanelEmpty>Liste o que tem valor em casa — ajuda no seguro, numa mudança ou num imprevisto.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-line-soft">
          {assets.map((asset) => {
            const details = [asset.category, asset.location].filter(Boolean).join(" · ");
            const warranty = asset.warranty_id ? warrantyName.get(asset.warranty_id) : null;
            return (
              <PanelRow key={asset.id} onDelete={() => setConfirmDeleteId(asset.id)} deleteLabel={`Excluir "${asset.name}"`}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-fg">
                    {asset.name}
                    {warranty && <ShieldCheckIcon size={14} weight="fill" className="shrink-0 text-success" aria-label={`Garantia: ${warranty}`} />}
                  </span>
                  {details && <span className="block truncate text-xs text-fg-3">{details}</span>}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-fg-2">{asset.estimated_value ? brl.format(asset.estimated_value) : "—"}</span>
              </PanelRow>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmAsset !== null}
        title={`Excluir "${confirmAsset?.name}"?`}
        description="O item sai do inventário. A garantia vinculada, se houver, continua em Documentos."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmAsset) deleteAsset.mutate(confirmAsset.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </PanelShell>
  );
}
