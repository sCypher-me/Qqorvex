import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState, SkeletonList } from "@qqorvex/ui";
import { useCreateWarranty, useDocuments, useWarranties } from "../hooks/useDocumentos";

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * "Garantias" como área dedicada — a tabela e `computeWarrantyEndDate()` já existiam, só faltava
 * a tela. Vincular a um documento (a nota fiscal, por exemplo) é opcional.
 */
export function WarrantiesPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { warranties, isLoading } = useWarranties(client);
  const { documents } = useDocuments(client);
  const createWarranty = useCreateWarranty(client, userId);
  const [documentId, setDocumentId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productName = String(form.get("productName") ?? "").trim();
    const purchaseDate = String(form.get("purchaseDate") ?? "");
    const durationMonths = Number(form.get("durationMonths"));
    if (!productName || !purchaseDate || !durationMonths) return;

    createWarranty.mutate({ productName, purchaseDate, durationMonths, documentId: documentId || undefined });
    event.currentTarget.reset();
    setDocumentId("");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 overflow-hidden">
      <CardHeader
        divider
        title="Garantias"
        meta={isLoading ? undefined : `${warranties.length} ${warranties.length === 1 ? "garantia" : "garantias"}`}
      />

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-[10px] px-[18px] py-[14px] border-b border-line">
        <input name="productName" placeholder="Produto" aria-label="Produto" className="q-input flex-[2_1_180px]" />
        <input
          name="purchaseDate"
          type="date"
          aria-label="Data da compra"
          className="q-input flex-[0_1_160px] font-mono text-[13px]"
        />
        <input
          name="durationMonths"
          type="number"
          min={1}
          placeholder="Meses"
          aria-label="Duração em meses"
          className="q-input flex-[0_1_100px] font-mono"
        />
        {documents.length > 0 && (
          <select
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            aria-label="Nota fiscal"
            className="q-input flex-[1_1_180px] text-[13px]"
          >
            <option value="">Nota fiscal (opcional)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" variant="primary" disabled={createWarranty.isPending}>
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <SkeletonList rows={3} className="px-5 py-3" />
      ) : warranties.length === 0 ? (
        <EmptyState className="px-5 py-4">
          Nenhuma garantia cadastrada. Informe produto, data da compra e duração — o fim é calculado para você.
        </EmptyState>
      ) : (
        <ul>
          {warranties.map((warranty) => {
            const expired = warranty.end_date < today;
            return (
              <li key={warranty.id} className="border-b border-line-soft last:border-b-0 flex items-center gap-[14px] px-[18px] py-[14px]">
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-medium truncate">{warranty.product_name}</span>
                  <span className="font-mono text-xs text-fg-3 truncate">
                    comprado em {formatDate(warranty.purchase_date)} · {warranty.duration_months}{" "}
                    {warranty.duration_months === 1 ? "mês" : "meses"}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${expired ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                  {expired ? "Vencida" : "Ativa"}
                </span>
                <span className={`font-mono text-xs whitespace-nowrap shrink-0 ${expired ? "text-danger" : "text-fg-2"}`}>
                  até {formatDate(warranty.end_date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
