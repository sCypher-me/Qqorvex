import { useMemo, useState, type ChangeEvent } from "react";
import { FileArrowUpIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, Button, Checkbox, EmptyState, Modal, Notice, Select, cx, useToast } from "@qqorvex/ui";
import { useImportTransactions } from "../hooks/useFinancas";
import { findDuplicateImports, parseStatementCsv, suggestCategory, type StatementRow } from "../insights";
import { formatBRL, formatDayMonth } from "../format";
import type { Account, Category, Transaction } from "../types";

interface DraftRow extends StatementRow {
  selected: boolean;
  duplicate: boolean;
  categoryId: string;
}

/**
 * Importa lançamentos de um extrato CSV do banco. Tudo acontece no navegador: o arquivo não é
 * enviado a lugar nenhum, só as linhas confirmadas viram lançamentos.
 */
export function ImportStatementDialog({
  isOpen,
  onClose,
  client,
  userId,
  accounts,
  categories,
  existing,
}: {
  isOpen: boolean;
  onClose: () => void;
  client: SupabaseClient<Database>;
  userId: string;
  accounts: Account[];
  categories: Category[];
  existing: Transaction[];
}) {
  const { toast } = useToast();
  const importTransactions = useImportTransactions(client, userId);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRows(null);
    setSkipped(0);
    setFileName("");
    setError(null);
  }

  function load(text: string) {
    const parsed = parseStatementCsv(text);
    if (parsed.rows.length === 0) {
      setError("Não encontramos lançamentos neste arquivo. Ele precisa ter colunas de data, descrição e valor.");
      return;
    }
    const duplicates = findDuplicateImports(parsed.rows, existing);
    setRows(
      parsed.rows.map((row) => ({
        ...row,
        duplicate: duplicates.has(row.line),
        selected: !duplicates.has(row.line),
        categoryId: suggestCategory(row.description, existing) ?? "",
      })),
    );
    setSkipped(parsed.skipped.length);
    setError(null);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("O arquivo é grande demais (máx. 5 MB).");
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    // Extratos brasileiros costumam vir em Windows-1252; tenta UTF-8 primeiro.
    let text = new TextDecoder("utf-8").decode(buffer);
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buffer);
    load(text);
    event.target.value = "";
  }

  const selected = useMemo(() => rows?.filter((row) => row.selected) ?? [], [rows]);
  const totals = selected.reduce((acc, row) => (row.type === "entrada" ? { ...acc, income: acc.income + row.amount } : { ...acc, expense: acc.expense + row.amount }), { income: 0, expense: 0 });

  async function confirm() {
    if (selected.length === 0) return;
    try {
      await importTransactions.mutateAsync(
        selected.map((row) => ({
          name: row.description,
          amount: row.amount,
          transactionType: row.type,
          date: row.date,
          categoryId: row.categoryId || undefined,
          accountId: accountId || undefined,
          status: "concluida" as const,
          tags: ["importado"],
        })),
      );
      toast({ title: `${selected.length} lançamentos importados`, description: fileName, tone: "success" });
      reset();
      onClose();
    } catch {
      setError("Não foi possível importar agora. Nada foi salvo; tente novamente.");
    }
  }

  function update(line: number, patch: Partial<DraftRow>) {
    setRows((current) => current?.map((row) => (row.line === line ? { ...row, ...patch } : row)) ?? null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Importar extrato"
      description="Envie o CSV exportado pelo seu banco. Você revisa tudo antes de salvar."
      size="xl"
      icon={<FileArrowUpIcon />}
      footer={
        rows ? (
          <>
            <span className="mr-auto text-xs text-fg-3">
              {selected.length} selecionados · <span className="text-success">+ {formatBRL(totals.income)}</span> · − {formatBRL(totals.expense)}
            </span>
            <Button variant="ghost" onClick={reset}>
              Trocar arquivo
            </Button>
            <Button onClick={() => void confirm()} loading={importTransactions.isPending} disabled={selected.length === 0}>
              Importar {selected.length}
            </Button>
          </>
        ) : undefined
      }
    >
      {!rows ? (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-canvas/50 px-6 py-10 text-center transition-colors hover:border-gold-line hover:bg-gold-soft/30">
            <UploadSimpleIcon size={28} className="text-fg-3" />
            <span className="text-[14px] font-medium text-fg">Escolher arquivo CSV</span>
            <span className="text-xs text-fg-3">Nubank, Itaú, Bradesco, Inter, C6, BB e outros — colunas de data, descrição e valor</span>
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(event) => void onFile(event)} />
          </label>
          {error && <Notice compact>{error}</Notice>}
          <p className="text-xs leading-relaxed text-fg-4">Dica: o arquivo é lido só no seu dispositivo. Lançamentos iguais aos que você já tem (mesma data, valor e descrição) são desmarcados automaticamente.</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nada para importar" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Conta do extrato" value={accountId} onChange={(event) => setAccountId(event.target.value)} wrapperClassName="min-w-[220px]">
              <option value="">Não vincular a uma conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <p className="pb-2 text-xs text-fg-3">
              {rows.length} lançamentos lidos{skipped ? ` · ${skipped} linhas ignoradas (saldo, totais ou sem data)` : ""}
            </p>
          </div>
          <div className="max-h-[50dvh] overflow-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-overlay text-xs text-fg-3">
                <tr className="border-b border-line">
                  <th className="w-10 px-3 py-2">
                    <Checkbox size="sm" aria-label="Selecionar todos" checked={selected.length === rows.length} indeterminate={selected.length > 0 && selected.length < rows.length} onChange={(event) => setRows(rows.map((row) => ({ ...row, selected: event.target.checked })))} />
                  </th>
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 font-medium">Descrição</th>
                  <th className="px-2 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((row) => (
                  <tr key={row.line} className={cx(!row.selected && "opacity-50")}>
                    <td className="px-3 py-1.5">
                      <Checkbox size="sm" aria-label={`Importar ${row.description}`} checked={row.selected} onChange={(event) => update(row.line, { selected: event.target.checked })} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-fg-3">{formatDayMonth(row.date)}</td>
                    <td className="max-w-[280px] px-2 py-1.5">
                      <span className="block truncate text-fg">{row.description}</span>
                      {row.duplicate && <Badge tone="warning" className="mt-0.5">Já existe</Badge>}
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={row.categoryId} onChange={(event) => update(row.line, { categoryId: event.target.value })} aria-label="Categoria" data-size="sm" className="q-input w-[170px]">
                        <option value="">Sem categoria</option>
                        {categories
                          .filter((category) => category.kind === row.type)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className={cx("whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums", row.type === "entrada" ? "text-success" : "text-fg")}>
                      {row.type === "entrada" ? "+ " : "− "}
                      {formatBRL(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <Notice compact>{error}</Notice>}
        </div>
      )}
    </Modal>
  );
}
