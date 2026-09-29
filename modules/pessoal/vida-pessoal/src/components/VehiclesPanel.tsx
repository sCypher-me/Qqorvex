import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { useTransactions, computeVehicleSpending } from "@qqorvex/module-financas";
import { Button, ConfirmDialog, EmptyState, Input, SkeletonList } from "@qqorvex/ui";
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
    <li className="border-t border-line-soft flex flex-col gap-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[13px] text-fg">{vehicle.nickname}</span>
          <span className="text-xs text-fg-3">{details || "sem detalhes"}</span>
        </span>
        <span className="font-mono text-xs text-fg-2" title="Total gasto">
          {brl.format(totalSpent)}
        </span>
        <Button type="button" variant="ghost" size="xs" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Fechar" : "Detalhes"}
        </Button>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 w-6 h-6 text-[11px] shrink-0"
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
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 p-3 flex flex-col gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="flex-1 text-[13px] text-fg">Total gasto</span>
            <span className="font-mono text-xs text-fg-2">{brl.format(totalSpent)}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Datas importantes (IPVA, seguro, revisão)</span>
            {dates.length === 0 ? (
              <EmptyState className="text-[13px]">Nenhuma data cadastrada.</EmptyState>
            ) : (
              <ul className="flex flex-col">
                {dates.map((d) => (
                  <li key={d.id} className="border-b border-line-soft last:border-b-0 flex items-baseline gap-2.5 py-1.5">
                    <span className="flex-1 text-[13px] text-fg">{d.label}</span>
                    <span className="font-mono text-xs text-fg-2">{formatIsoDate(d.date)}</span>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!label.trim() || !date) return;
                addDate.mutate({ label: label.trim(), date }, {
                  onSuccess: () => { setLabel(""); setDate(""); },
                });
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
              <Button type="submit" variant="quiet" size="xs" className="self-start" disabled={addDate.isPending}>
                {addDate.isPending ? "Salvando…" : "Adicionar data"}
              </Button>
              {addDate.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar a data; os campos continuam preenchidos.</p>}
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nickname = String(form.get("nickname") ?? "").trim();
    if (!nickname) return;
    createVehicle.mutate({
      nickname,
      brand: String(form.get("brand") ?? "").trim() || undefined,
      model: String(form.get("model") ?? "").trim() || undefined,
      plate: String(form.get("plate") ?? "").trim() || undefined,
      year: form.get("year") ? Number(form.get("year")) : undefined,
    }, { onSuccess: () => formElement.reset() });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Veículos</h2>
        {!isLoading && <span className="font-mono text-xs text-fg-3">{vehicles.length}</span>}
      </div>

      {isLoading ? (
        <SkeletonList rows={2} className="py-2" />
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
        <form onSubmit={handleSubmit} className="border-t border-line-soft pt-3 flex flex-col gap-2.5">
          <Input name="nickname" placeholder="Apelido" aria-label="Apelido" className="py-2 text-[13px]" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input name="brand" placeholder="Marca" aria-label="Marca" className="py-2 text-[13px]" />
            <Input name="model" placeholder="Modelo" aria-label="Modelo" className="py-2 text-[13px]" />
            <Input name="year" type="number" placeholder="Ano" aria-label="Ano" className="py-2 text-[13px] font-mono" />
            <Input name="plate" placeholder="Placa" aria-label="Placa" className="py-2 text-[13px] font-mono" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "Salvando…" : "Adicionar"}
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
      {createVehicle.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar o veículo; os campos continuam preenchidos.</p>}
    </section>
  );
}
