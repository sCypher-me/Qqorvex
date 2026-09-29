import { useState, type FormEvent } from "react";
import { CalendarBlankIcon, CarProfileIcon, CaretDownIcon, TrashIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import { useTransactions, computeVehicleSpending } from "@qqorvex/module-financas";
import { Button, ConfirmDialog, Input, SkeletonList, cx } from "@qqorvex/ui";
import { useAddVehicleImportantDate, useCreateVehicle, useDeleteVehicle, useVehicleImportantDates, useVehicles } from "../hooks/useVidaPratica";
import { localDateKey } from "../service";
import type { Vehicle } from "../types";
import { PanelEmpty, PanelShell, brlCents } from "./PanelShell";

/** `yyyy-mm-dd` → `dd/mm/aaaa` sem passar por `Date` (evita deslocamento de fuso). */
function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

function daysUntil(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  const [ty = 0, tm = 1, td = 1] = localDateKey(new Date()).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

function relativeDays(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days > 1) return `em ${days} dias`;
  if (days === -1) return "ontem";
  return `há ${-days} dias`;
}

/**
 * Total gasto por Veículo: busca as transações do usuário e soma via `computeVehicleSpending()`
 * (puro, em `@qqorvex/module-financas`) — Vida Pessoal conhece Finanças aqui, nunca o contrário.
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
  const sortedDates = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const next = sortedDates.find((item) => daysUntil(item.date) >= 0);
  const nextDays = next ? daysUntil(next.date) : null;

  return (
    <li className="min-w-0">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-hover">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-fg-2" aria-hidden="true">
          <CarProfileIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-fg">{vehicle.nickname}</span>
          <span className="block truncate text-xs text-fg-3">{details || "sem detalhes"}</span>
        </span>
        {next && nextDays !== null && (
          <span className={cx("hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline", nextDays <= 30 ? "bg-warning-soft text-warning" : "bg-hover text-fg-2")}>
            {next.label} {relativeDays(nextDays)}
          </span>
        )}
        <CaretDownIcon size={14} className={cx("shrink-0 text-fg-4 transition-transform", !expanded && "-rotate-90")} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-line-soft bg-canvas/40 px-4 py-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line-soft bg-surface px-3 py-2.5">
              <dt className="text-[11px] text-fg-3">Gasto registrado</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-fg">{brlCents.format(totalSpent)}</dd>
            </div>
            <div className="rounded-lg border border-line-soft bg-surface px-3 py-2.5">
              <dt className="text-[11px] text-fg-3">Próximo compromisso</dt>
              <dd className="mt-0.5 truncate text-[13px] font-medium text-fg">{next && nextDays !== null ? `${next.label} · ${relativeDays(nextDays)}` : "Nenhum"}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-fg-2">Datas importantes</h3>
            {sortedDates.length === 0 ? (
              <p className="text-[13px] text-fg-3">IPVA, seguro, licenciamento, revisão — cadastre para ser lembrado.</p>
            ) : (
              <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft bg-surface">
                {sortedDates.map((item) => {
                  const days = daysUntil(item.date);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                      <CalendarBlankIcon size={15} className="shrink-0 text-fg-3" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{item.label}</span>
                      <span className="text-xs tabular-nums text-fg-3">{formatIsoDate(item.date)}</span>
                      <span className={cx("w-20 shrink-0 text-right text-xs", days < 0 ? "text-fg-4" : days <= 30 ? "font-medium text-warning" : "text-fg-2")}>{relativeDays(days)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!label.trim() || !date) return;
                addDate.mutate(
                  { label: label.trim(), date },
                  {
                    onSuccess: () => {
                      setLabel("");
                      setDate("");
                    },
                  },
                );
              }}
              className="flex flex-wrap gap-2"
            >
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ex.: IPVA" aria-label="Descrição da data" fieldSize="sm" wrapperClassName="min-w-[120px] flex-1" />
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Data" fieldSize="sm" wrapperClassName="w-[150px]" />
              <Button type="submit" variant="secondary" size="sm" disabled={!label.trim() || !date} loading={addDate.isPending}>
                Adicionar
              </Button>
            </form>
            {addDate.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar a data; os campos continuam preenchidos.</p>}
          </div>

          <AttachDocumentPanel client={client} relatedModule="vida-pessoal" relatedEntityId={vehicle.id} />

          <Button variant="ghost" size="sm" leadingIcon={<TrashIcon size={14} />} className="self-start text-danger" onClick={() => setConfirmOpen(true)}>
            Excluir veículo
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${vehicle.nickname}"?`}
        description="As datas cadastradas saem junto. Transações em Finanças não são apagadas."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
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
    createVehicle.mutate(
      {
        nickname,
        brand: String(form.get("brand") ?? "").trim() || undefined,
        model: String(form.get("model") ?? "").trim() || undefined,
        plate: String(form.get("plate") ?? "").trim() || undefined,
        year: form.get("year") ? Number(form.get("year")) : undefined,
      },
      {
        onSuccess: () => {
          formElement.reset();
          setFormOpen(false);
        },
      },
    );
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input name="nickname" placeholder="Como você chama o veículo (ex.: Onix prata)" aria-label="Apelido" fieldSize="sm" autoFocus />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="brand" placeholder="Marca" aria-label="Marca" fieldSize="sm" />
        <Input name="model" placeholder="Modelo" aria-label="Modelo" fieldSize="sm" />
        <Input name="year" type="number" placeholder="Ano" aria-label="Ano" fieldSize="sm" />
        <Input name="plate" placeholder="Placa" aria-label="Placa" fieldSize="sm" className="uppercase" />
      </div>
      <Button type="submit" size="sm" className="self-start" loading={createVehicle.isPending}>
        Salvar veículo
      </Button>
      {createVehicle.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar o veículo; os campos continuam preenchidos.</p>}
    </form>
  );

  return (
    <PanelShell
      icon={<CarProfileIcon />}
      title="Veículos"
      meta={isLoading ? undefined : vehicles.length || undefined}
      summary="Datas, gastos e documentos de cada um"
      addLabel="Adicionar veículo"
      formOpen={formOpen}
      onToggleForm={() => setFormOpen((value) => !value)}
      form={form}
    >
      {isLoading ? (
        <SkeletonList rows={1} leading />
      ) : vehicles.length === 0 ? (
        <PanelEmpty>Cadastre seu carro ou moto para acompanhar IPVA, seguro, revisões e quanto ele custa.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-line-soft">
          {vehicles.map((vehicle) => (
            <VehicleRow key={vehicle.id} client={client} vehicle={vehicle} onDelete={() => deleteVehicle.mutate(vehicle.id)} />
          ))}
        </ul>
      )}
    </PanelShell>
  );
}
