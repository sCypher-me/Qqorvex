import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { useTransactions, computeVehicleSpending } from "@qqorvex/module-financas";
import { Button, ConfirmDialog, EmptyState, Input } from "@qqorvex/ui";
import {
  useAddVehicleImportantDate,
  useCreateVehicle,
  useDeleteVehicle,
  useVehicleImportantDates,
  useVehicles,
} from "../hooks/useVidaPratica";
import type { Vehicle } from "../types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** `yyyy-mm-dd` → `dd/mm/aaaa` sem passar por `Date` (evita deslocamento de fuso). */
function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/**
 * Total gasto por Veículo (docs/decisions/pending.md — integração Finanças ↔ Veículos): busca as
 * transações do usuário e soma via `computeVehicleSpending()` (puro, em `@qqorvex/module-financas`)
 * — Vida Pessoal conhece Finanças aqui, nunca o contrário (Finanças não sabe o que é um Veículo).
 */
function VehicleRow({ client, vehicle, onDelete }: { client: SupabaseClient<Database>; vehicle: Vehicle; onDelete: () => void }) {
  const { dates } = useVehicleImportantDates(client, vehicle.id);
  const addDate = useAddVehicleImportantDate(client, vehicle.id);
  const { transactions } = useTransactions(client);
  const totalSpent = computeVehicleSpending(transactions, vehicle.id);
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const details = [vehicle.brand, vehicle.model, vehicle.year, vehicle.plate].filter(Boolean).join(" · ");

  return (
    <li className="qv-row-top flex flex-col gap-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[13px] text-text-primary">{vehicle.nickname}</span>
          <span className="text-xs text-text-muted">{details || "sem detalhes"}</span>
        </span>
        <span className="font-mono text-xs text-text-secondary" title="Total gasto">
          {brl.format(totalSpent)}
        </span>
        <Button type="button" variant="ghost" size="xs" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Fechar" : "Detalhes"}
        </Button>
        <button
          type="button"
          className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
          aria-label={`Excluir "${vehicle.nickname}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
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
        <div className="qv-well p-3 flex flex-col gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="flex-1 text-[13px] text-text-primary">Total gasto</span>
            <span className="font-mono text-xs text-text-secondary">{brl.format(totalSpent)}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="qv-eyebrow">Datas importantes (IPVA, seguro, revisão)</span>
            {dates.length === 0 ? (
              <EmptyState className="text-[13px]">Nenhuma data cadastrada.</EmptyState>
            ) : (
              <ul className="flex flex-col">
                {dates.map((d) => (
                  <li key={d.id} className="qv-row flex items-baseline gap-2.5 py-1.5">
                    <span className="flex-1 text-[13px] text-text-primary">{d.label}</span>
                    <span className="font-mono text-xs text-text-secondary">{formatIsoDate(d.date)}</span>
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
              className="flex flex-col gap-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex.: IPVA"
                  aria-label="Descrição da data"
                  className="py-2 text-[13px]"
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Data"
                  className="py-2 text-[13px] font-mono"
                />
              </div>
              <Button type="submit" variant="quiet" size="xs" className="self-start">
                Adicionar data
              </Button>
            </form>
          </div>

          <AttachDocumentPanel client={client} relatedModule="vida-pessoal" relatedEntityId={vehicle.id} />
        </div>
      )}
    </li>
  );
}

/** Documentos do veículo (CRLV, seguro) usam `document_relations` já existente — nenhuma tabela nova pra isso. */
export function VehiclesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { vehicles, isLoading } = useVehicles(client);
  const createVehicle = useCreateVehicle(client, userId);
  const deleteVehicle = useDeleteVehicle(client);
  const [formOpen, setFormOpen] = useState(false);

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
    <section className="qv-card p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-text-primary">Veículos</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{vehicles.length}</span>}
      </div>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : vehicles.length === 0 ? (
        <EmptyState>Nenhum veículo cadastrado.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {vehicles.map((vehicle) => (
            <VehicleRow key={vehicle.id} client={client} vehicle={vehicle} onDelete={() => deleteVehicle.mutate(vehicle.id)} />
          ))}
        </ul>
      )}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="qv-row-top pt-3 flex flex-col gap-2.5">
          <Input name="nickname" placeholder="Apelido" aria-label="Apelido" className="py-2 text-[13px]" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input name="brand" placeholder="Marca" aria-label="Marca" className="py-2 text-[13px]" />
            <Input name="model" placeholder="Modelo" aria-label="Modelo" className="py-2 text-[13px]" />
            <Input name="year" type="number" placeholder="Ano" aria-label="Ano" className="py-2 text-[13px] font-mono" />
            <Input name="plate" placeholder="Placa" aria-label="Placa" className="py-2 text-[13px] font-mono" />
          </div>
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
    </section>
  );
}
