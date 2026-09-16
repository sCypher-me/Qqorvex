import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { useTransactions, computeVehicleSpending } from "@qqorvex/module-financas";
import { Button, Card, ConfirmDialog } from "@qqorvex/ui";
import {
  useAddVehicleImportantDate,
  useCreateVehicle,
  useDeleteVehicle,
  useVehicleImportantDates,
  useVehicles,
} from "../hooks/useVidaPratica";
import type { Vehicle } from "../types";

/**
 * Total gasto por Veículo (docs/decisions/pending.md — integração Finanças ↔ Veículos): busca as
 * transações do usuário e soma via `computeVehicleSpending()` (puro, em `@qqorvex/module-financas`)
 * — Vida Pessoal conhece Finanças aqui, nunca o contrário (Finanças não sabe o que é um Veículo).
 */
function VehicleCard({ client, vehicle, onDelete }: { client: SupabaseClient<Database>; vehicle: Vehicle; onDelete: () => void }) {
  const { dates } = useVehicleImportantDates(client, vehicle.id);
  const addDate = useAddVehicleImportantDate(client, vehicle.id);
  const { transactions } = useTransactions(client);
  const totalSpent = computeVehicleSpending(transactions, vehicle.id);
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-sans text-sm text-text-primary">{vehicle.nickname}</p>
          <p className="font-sans text-xs text-text-secondary-warm">
            {[vehicle.brand, vehicle.model, vehicle.year, vehicle.plate].filter(Boolean).join(" · ") || "sem detalhes"}
            {" · "}Total gasto: R$ {totalSpent.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="chip" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Fechar" : "Detalhes"}
          </Button>
          <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
            Excluir
          </Button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${vehicle.nickname}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {expanded && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          <div>
            <p className="font-sans text-xs text-text-secondary-warm mb-1">Datas importantes (IPVA, seguro, revisão)</p>
            {dates.length === 0 ? (
              <p className="font-sans text-sm text-text-secondary-warm">Nenhuma data cadastrada.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {dates.map((d) => (
                  <li key={d.id} className="font-sans text-sm text-text-primary">
                    {d.label}: {d.date}
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!label.trim() || !date) return;
                addDate.mutate({ label: label.trim(), date });
                setLabel("");
                setDate("");
              }}
              className="flex gap-2 mt-1"
            >
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex.: IPVA"
                className="flex-1 text-sm rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary"
              />
              <Button type="submit" variant="ghost">
                Adicionar
              </Button>
            </form>
          </div>

          <AttachDocumentPanel client={client} relatedModule="vida-pessoal" relatedEntityId={vehicle.id} />
        </div>
      )}
    </Card>
  );
}

/** Documentos do veículo (CRLV, seguro) usam `document_relations` já existente — nenhuma tabela nova pra isso. */
export function VehiclesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { vehicles, isLoading } = useVehicles(client);
  const createVehicle = useCreateVehicle(client, userId);
  const deleteVehicle = useDeleteVehicle(client);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nickname = String(form.get("nickname") ?? "").trim();
    if (!nickname) return;
    createVehicle.mutate({
      nickname,
      brand: String(form.get("brand") ?? "").trim() || undefined,
      model: String(form.get("model") ?? "").trim() || undefined,
      plate: String(form.get("plate") ?? "").trim() || undefined,
      year: form.get("year") ? Number(form.get("year")) : undefined,
    });
    event.currentTarget.reset();
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input name="nickname" placeholder="Apelido" className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="brand" placeholder="Marca" className="w-24 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="model" placeholder="Modelo" className="w-24 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="year" type="number" placeholder="Ano" className="w-20 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input name="plate" placeholder="Placa" className="w-24 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : vehicles.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum veículo cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} client={client} vehicle={vehicle} onDelete={() => deleteVehicle.mutate(vehicle.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
