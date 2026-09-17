import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, CardHeader, EmptyState } from "@qqorvex/ui";
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
    <div className="qv-card overflow-hidden">
      <CardHeader
        divider
        title="Garantias"
        meta={isLoading ? undefined : `${warranties.length} ${warranties.length === 1 ? "garantia" : "garantias"}`}
      />

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-[10px] px-[18px] py-[14px] border-b border-border">
        <input name="productName" placeholder="Produto" aria-label="Produto" className="qv-field flex-[2_1_180px]" />
        <input
          name="purchaseDate"
          type="date"
          aria-label="Data da compra"
          className="qv-field flex-[0_1_160px] font-mono text-[13px]"
        />
        <input
          name="durationMonths"
          type="number"
          min={1}
          placeholder="Meses"
          aria-label="Duração em meses"
          className="qv-field flex-[0_1_100px] font-mono"
        />
        {documents.length > 0 && (
          <select
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            aria-label="Nota fiscal"
            className="qv-field flex-[1_1_180px] text-[13px]"
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
        <EmptyState className="px-5 py-4">Carregando garantias...</EmptyState>
      ) : warranties.length === 0 ? (
        <EmptyState className="px-5 py-4">
          Nenhuma garantia cadastrada. Informe produto, data da compra e duração — o fim é calculado para você.
        </EmptyState>
      ) : (
        <ul>
          {warranties.map((warranty) => {
            const expired = warranty.end_date < today;
            return (
              <li key={warranty.id} className="qv-row flex items-center gap-[14px] px-[18px] py-[14px]">
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-medium truncate">{warranty.product_name}</span>
                  <span className="font-mono text-xs text-text-muted truncate">
                    comprado em {formatDate(warranty.purchase_date)} · {warranty.duration_months}{" "}
                    {warranty.duration_months === 1 ? "mês" : "meses"}
                  </span>
                </div>
                <span className={`qv-pill shrink-0 ${expired ? "qv-pill-danger" : "qv-pill-success"}`}>
                  {expired ? "Vencida" : "Ativa"}
                </span>
                <span className={`font-mono text-xs whitespace-nowrap shrink-0 ${expired ? "text-error" : "text-text-secondary"}`}>
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
