import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCreateWarranty, useDocuments, useWarranties } from "../hooks/useDocumentos";

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
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-semibold text-text-secondary-warm">Garantias</h3>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <input
          name="productName"
          placeholder="Produto"
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        />
        <input
          name="purchaseDate"
          type="date"
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        />
        <input
          name="durationMonths"
          type="number"
          min={1}
          placeholder="Meses"
          className="w-20 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        />
        {documents.length > 0 && (
          <select
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Nota fiscal (opcional)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file_name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" variant="secondary" disabled={createWarranty.isPending}>
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando garantias...</p>
      ) : warranties.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhuma garantia cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {warranties.map((warranty) => (
            <li
              key={warranty.id}
              className="bg-surface-2 border border-border rounded-md p-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-sans text-sm text-text-primary">{warranty.product_name}</p>
                <p className="font-sans text-xs text-text-secondary-warm">
                  Comprado em {warranty.purchase_date} · vence em {warranty.end_date}
                </p>
              </div>
              {warranty.end_date < today && (
                <span className="text-xs px-2 py-1 rounded-md border border-error/40 text-error">Vencida</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
