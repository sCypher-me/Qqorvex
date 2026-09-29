import { useMemo, useState, type FormEvent } from "react";
import { Button, ChipTabs, EmptyState, Input, Modal, Notice, PlusIcon, SkeletonList } from "@qqorvex/ui";
import { useAuth, verifySecurityPin } from "@qqorvex/auth";
import {
  useDocuments,
  useDocumentStorageQuota,
  useUploadDocument,
  useDeleteDocument,
  useToggleImportant,
  useToggleVault,
  useFolders,
  useMoveDocumentToFolder,
  useUpdateDocumentType,
  useExtractText,
  useSetDocumentArchived,
  useWarranties,
  DOCUMENT_TYPE_LABELS,
  UploadForm,
  DocumentCard,
  TrashPanel,
  VersionHistoryPanel,
  FoldersPanel,
  WarrantiesPanel,
  selectDocuments,
  type DocumentQuickFilter,
  type DocumentSortOrder,
} from "@qqorvex/module-documentos";
import { getDownloadUrl } from "@qqorvex/module-documentos";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";

type DocumentsView = "lista" | "arquivados" | "garantias" | "lixeira";

const DOCUMENT_VIEWS: { value: DocumentsView; label: string }[] = [
  { value: "lista", label: "Meus documentos" },
  { value: "arquivados", label: "Arquivados" },
  { value: "garantias", label: "Garantias" },
  { value: "lixeira", label: "Lixeira" },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function daysUntil(isoDate: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(`${isoDate}T00:00:00`).getTime() - start.getTime()) / MS_PER_DAY);
}

/** "21 dias", "4 meses" — distância curta até uma data futura. */
function formatDistance(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "1 dia";
  if (days < 60) return `${days} dias`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months} meses`;
  return `${Math.round(months / 12)} anos`;
}

function formatMonthYear(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return `${MONTHS_SHORT[date.getMonth()]}/${date.getFullYear()}`;
}

export function DocumentosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [view, setView] = useState<DocumentsView>("lista");
  const [versionsDocumentId, setVersionsDocumentId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<DocumentQuickFilter>("all");
  const [sortOrder, setSortOrder] = useState<DocumentSortOrder>("newest");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { currentItem, setCurrentItem } = useCurrentItem();
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);

  const { documents: allDocuments, isLoading, error: documentsError, refetch: refetchDocuments } = useDocuments(supabase);
  const { quota: storageQuota } = useDocumentStorageQuota(supabase);
  const { documents: archivedDocuments, isLoading: archivedLoading, error: archivedError, refetch: refetchArchived } = useDocuments(
    supabase,
    true,
    view === "arquivados",
  );
  const { folders } = useFolders(supabase);
  const { warranties } = useWarranties(supabase);
  const sourceDocuments = view === "arquivados" ? archivedDocuments : allDocuments;
  const documents = useMemo(() => selectDocuments(sourceDocuments, {
    query: search,
    folderId: selectedFolderId,
    type: selectedType as "" | keyof typeof DOCUMENT_TYPE_LABELS,
    quickFilter: view === "lista" ? quickFilter : "all",
    sort: sortOrder,
  }), [sourceDocuments, search, selectedFolderId, selectedType, quickFilter, view, sortOrder]);
  const activeDocumentsError = view === "arquivados" ? archivedError : documentsError;
  const activeDocumentsLoading = view === "arquivados" ? archivedLoading : isLoading;
  const retryDocuments = view === "arquivados" ? refetchArchived : refetchDocuments;
  const uploadDocument = useUploadDocument(supabase, userId);
  const deleteDocument = useDeleteDocument(supabase);
  const toggleImportant = useToggleImportant(supabase);
  const toggleVault = useToggleVault(supabase);
  const moveToFolder = useMoveDocumentToFolder(supabase);
  const updateType = useUpdateDocumentType(supabase);
  const extractText = useExtractText(supabase);
  const setArchived = useSetDocumentArchived(supabase);

  const today = new Date();
  const vaultCount = allDocuments.filter((d) => d.is_vault).length;
  const importantCount = allDocuments.filter((d) => d.is_important).length;
  const recentCount = allDocuments.filter((d) => {
    const age = Date.now() - new Date(d.created_at).getTime();
    return age >= 0 && age < 7 * MS_PER_DAY;
  }).length;
  const hasActiveFilters = Boolean(search.trim() || selectedFolderId || selectedType || (view === "lista" && quickFilter !== "all"));
  const upcomingWarranties = warranties
    .map((w) => ({ warranty: w, days: daysUntil(w.end_date, today) }))
    .filter((w) => w.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  function activateQuickFilter(filter: DocumentQuickFilter) {
    setView("lista");
    setSelectedFolderId(null);
    setSelectedType("");
    setSearch("");
    setQuickFilter(filter);
  }

  async function handleExtractText(documentId: string, storagePath: string) {
    setExtractingDocumentId(documentId);
    setExtractProgress(0);
    setExtractError(null);
    try {
      const imageUrl = await getDownloadUrl(supabase, storagePath);
      await extractText.mutateAsync({
        documentId,
        imageUrl,
        onProgress: setExtractProgress,
      });
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : "Não foi possível extrair o texto desta imagem.");
    } finally {
      setExtractingDocumentId(null);
    }
  }

  async function handleUnlockVault(event: FormEvent) {
    event.preventDefault();
    setPinError(null);
    setPinBusy(true);
    try {
      const isCorrect = await verifySecurityPin(supabase, pinInput.trim());
      if (!isCorrect) {
        setPinError("PIN incorreto. O Cofre continua bloqueado.");
        return;
      }
      setVaultUnlocked(true);
      setPinInput("");
    } catch {
      setPinError("Não foi possível verificar o PIN agora. Confira a conexão e tente novamente.");
    } finally {
      setPinBusy(false);
    }
  }

  /** Vencimento de um documento = garantia vinculada a ele (única data real que o módulo tem por documento). */
  function dueFor(documentId: string): { label: string; color: string } | undefined {
    const linked = warranties
      .filter((w) => w.document_id === documentId)
      .sort((a, b) => a.end_date.localeCompare(b.end_date))[0];
    if (!linked) return undefined;
    const days = daysUntil(linked.end_date, today);
    if (days < 0) return { label: "garantia vencida", color: "var(--color-error)" };
    if (days <= 30) return { label: `vence em ${formatDistance(days)}`, color: "var(--color-warning)" };
    return { label: `garantia até ${formatMonthYear(linked.end_date)}`, color: "var(--color-success)" };
  }

  return (
    <div className="qv-page editorial-module-page flex flex-col gap-6 pb-8">
      <section className="qv-hero editorial-module-hero" aria-labelledby="documents-page-title">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="qv-eyebrow text-vex-gold-bright">Arquivo central</p>
            <h1 id="documents-page-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-4xl">Documentos</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">Guarde arquivos importantes, encontre tudo rapidamente e mantenha garantias e versões sob controle.</p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <div className="rounded-full border border-border bg-surface-1/50 px-3 py-2 text-xs text-text-secondary">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />Privado por padrão
            </div>
            <Button type="button" variant="primary" onClick={() => setIsUploadDialogOpen(true)}>
              <PlusIcon size={16} aria-hidden="true" /> Adicionar arquivo
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2" aria-label="Filtros rápidos dos documentos">
        {[
          { label: "Ativos", value: allDocuments.length, filter: "all" as const },
          { label: "Importantes", value: importantCount, filter: "important" as const },
          { label: "No Cofre", value: vaultCount, filter: "vault" as const },
          { label: "Recentes", value: recentCount, filter: "recent" as const },
        ].map(({ label, value, filter }) => (
          <button
            key={label}
            type="button"
            aria-pressed={view === "lista" && quickFilter === filter}
            onClick={() => activateQuickFilter(filter)}
            className={`qv-btn qv-btn-secondary min-h-9 gap-2 px-3 text-xs ${view === "lista" && quickFilter === filter ? "border-vex-cyan-dark bg-chip-cyan text-text-primary" : ""}`}
          >
            <span>{label}</span>
            <span className="font-mono text-text-muted">{value}</span>
          </button>
        ))}
      </section>

      <Modal
        isOpen={isUploadDialogOpen}
        onClose={() => {
          if (!uploadDocument.isPending) setIsUploadDialogOpen(false);
        }}
        title="Adicionar arquivo"
        size="lg"
      >
        <div className="-mt-3 flex flex-col gap-1">
          <p className="m-0 text-sm leading-relaxed text-text-muted">Arraste um arquivo ou escolha do computador. Você pode alterar o tipo depois do envio.</p>
          {storageQuota && <p className="m-0 text-xs text-text-secondary">Nuvem: {formatDocumentStorage(storageQuota.usedBytes)} de {formatDocumentStorage(storageQuota.quotaBytes)} · até {formatDocumentStorage(storageQuota.maxFileBytes)} por arquivo</p>}
        </div>
        <UploadForm
          isUploading={uploadDocument.isPending}
          folders={folders}
          folderId={uploadFolderId}
          onFolderChange={setUploadFolderId}
          onUpload={async (file, documentType, options) => {
            await uploadDocument.mutateAsync({ file, fileName: file.name, documentType, force: options?.force, folderId: options?.folderId });
            setIsUploadDialogOpen(false);
          }}
        />
      </Modal>

      <section className="qv-card gap-4 p-4 sm:p-5" aria-labelledby="document-filters-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="document-filters-title" className="font-display text-lg font-semibold text-text-primary">Organização</h2>
            <p className="mt-1 text-xs text-text-muted">Pastas e filtros para chegar ao arquivo certo sem procurar demais.</p>
          </div>
          <ChipTabs options={DOCUMENT_VIEWS} value={view} onChange={setView} />
        </div>
        <FoldersPanel
          client={supabase}
          userId={userId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            if (view !== "arquivados") setUploadFolderId(folderId ?? "");
            if (view === "garantias" || view === "lixeira") setView("lista");
          }}
          actions={
            <select
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value);
                if (view === "garantias" || view === "lixeira") setView("lista");
              }}
              aria-label="Filtrar por tipo"
              className="qv-field w-auto py-2 px-3 text-[13px] text-text-secondary"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          }
        />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        {view === "lixeira" ? (
          <TrashPanel client={supabase} />
        ) : view === "garantias" ? (
          <WarrantiesPanel client={supabase} userId={userId} />
        ) : (
          <section className="qv-card overflow-hidden" aria-labelledby="document-list-title">
            <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-5">
              <div className="min-w-0 flex-1">
                <h2 id="document-list-title" className="font-display text-xl font-semibold text-text-primary">{view === "arquivados" ? "Documentos arquivados" : "Seus arquivos"}</h2>
                <p className="mt-1 text-xs text-text-muted">{documents.length} {documents.length === 1 ? "resultado" : "resultados"} · {view === "arquivados" ? "itens arquivados" : "busca também no texto extraído"}{selectedType ? ` · ${DOCUMENT_TYPE_LABELS[selectedType as keyof typeof DOCUMENT_TYPE_LABELS]}` : ""}</p>
              </div>
              <Input
                aria-label="Buscar documentos"
                placeholder="Nome, tipo ou conteúdo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full sm:w-64"
              />
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as DocumentSortOrder)}
                aria-label="Ordenar documentos"
                className="qv-field w-full py-2.5 px-3 text-[13px] text-text-secondary sm:w-auto"
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="name">Nome A–Z</option>
                <option value="largest">Maior tamanho</option>
              </select>
            </div>
            {activeDocumentsError && sourceDocuments.length === 0 ? (
              <Notice
                tone="error"
                title="Não foi possível carregar seus documentos"
                className="m-4"
                actions={
                  <Button type="button" variant="secondary" size="sm" onClick={() => void retryDocuments()}>
                    Tentar novamente
                  </Button>
                }
              >
                Seus arquivos continuam armazenados. Confira a conexão e tente atualizar a lista.
              </Notice>
                ) : activeDocumentsLoading && sourceDocuments.length === 0 ? (
              <SkeletonList rows={4} className="px-5 py-3" />
            ) : (
              <>
                {extractError && <Notice tone="error" title="Falha ao ler texto da imagem" className="m-4">{extractError}</Notice>}
                {setArchived.error && <Notice tone="error" title="Não foi possível arquivar o documento" className="m-4">O arquivo continua na lista. Tente novamente pelas opções do documento.</Notice>}
                {activeDocumentsError && (
                  <Notice tone="warning" title="Mostrando a última lista disponível" className="m-4">
                    A atualização falhou, mas os arquivos já carregados continuam disponíveis.
                  </Notice>
                )}
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                    <EmptyState>
                      {view === "arquivados" && archivedDocuments.length === 0
                        ? "Nenhum documento arquivado. Use ‘Arquivar’ nas opções de um arquivo para guardá-lo sem misturar com os itens ativos."
                        : sourceDocuments.length === 0
                          ? "Nenhum documento ainda. Envie o primeiro arquivo pela área acima."
                          : "Nenhum documento combina com esta busca e estes filtros. Ajuste ou limpe os filtros."}
                    </EmptyState>
                  {hasActiveFilters && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setSearch("");
                      setSelectedFolderId(null);
                      setSelectedType("");
                      setQuickFilter("all");
                    }}>
                      Limpar filtros
                    </Button>
                  )}
                  </div>
                ) : (
                  documents.map((document) =>
                    versionsDocumentId === document.id ? (
                      <VersionHistoryPanel
                        key={document.id}
                        client={supabase}
                        document={document}
                        onClose={() => setVersionsDocumentId(null)}
                      />
                    ) : (
                      <DocumentCard
                        key={document.id}
                        document={document}
                        folders={folders}
                        due={dueFor(document.id)}
                        onDownload={async () => {
                          const url = await getDownloadUrl(supabase, document.storage_path);
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        onToggleImportant={() =>
                          toggleImportant.mutate({ documentId: document.id, isImportant: !document.is_important })
                        }
                        onToggleVault={() => toggleVault.mutate({ documentId: document.id, isVault: !document.is_vault })}
                        onDelete={() => deleteDocument.mutate(document.id)}
                        onOpenVersions={() => setVersionsDocumentId(document.id)}
                        isArchived={view === "arquivados"}
                        onToggleArchive={() => setArchived.mutate({ documentId: document.id, isArchived: view !== "arquivados" })}
                        onMoveToFolder={(folderId) => moveToFolder.mutate({ documentId: document.id, folderId })}
                        onChangeType={(documentType) => updateType.mutate({ documentId: document.id, documentType })}
                        onExtractText={() => handleExtractText(document.id, document.storage_path)}
                        isExtractingText={extractingDocumentId === document.id}
                        extractProgress={extractingDocumentId === document.id ? extractProgress : undefined}
                        isFocused={currentItem?.type === "documento" && currentItem.id === document.id}
                        onFocus={() =>
                          currentItem?.type === "documento" && currentItem.id === document.id
                            ? setCurrentItem(null)
                            : setCurrentItem({ type: "documento", id: document.id, label: document.file_name })
                        }
                        isMasked={document.is_vault && !vaultUnlocked}
                      />
                    ),
                  )
                )}
              </>
            )}
          </section>
        )}

        <aside className="flex flex-col gap-4">
          {vaultCount > 0 && (
            <section className="qv-card gap-3 p-5" aria-labelledby="vault-title">
              <div className="flex items-center gap-2">
                <span id="vault-title" className="font-display text-lg font-semibold">Cofre</span>
                <span className={`qv-pill ${vaultUnlocked ? "qv-pill-success" : "qv-pill-warning"}`}>
                  {vaultUnlocked ? "Aberto" : "Bloqueado"}
                </span>
              </div>
              {vaultUnlocked ? (
                <>
                  <span className="text-[13px] leading-normal text-text-secondary">
                    <span className="font-mono">{vaultCount}</span> {vaultCount === 1 ? "documento está visível" : "documentos estão visíveis"} nesta
                    sessão. Bloqueie de novo quando terminar.
                  </span>
                  <Button type="button" variant="quiet" size="sm" className="self-start" onClick={() => setVaultUnlocked(false)}>
                    Bloquear
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-[13px] leading-normal text-text-secondary">
                    <span className="font-mono">{vaultCount}</span>{" "}
                    {vaultCount === 1 ? "documento fica mascarado" : "documentos ficam mascarados"} até você digitar o PIN.
                    Nada é aberto automaticamente.
                  </span>
                  <form onSubmit={handleUnlockVault} className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="PIN"
                      aria-label="PIN do Cofre"
                      aria-invalid={pinError ? true : undefined}
                      className="qv-field flex-1 py-2.5 px-3 font-mono tracking-[.3em]"
                    />
                    <Button type="submit" variant="primary" size="sm" className="py-2.5" disabled={pinBusy || !pinInput.trim()}>
                      {pinBusy ? "Verificando..." : "Abrir"}
                    </Button>
                  </form>
                  {pinError && <span className="text-xs text-error">{pinError}</span>}
                </>
              )}
            </section>
          )}

          <section className="qv-card gap-3 p-5" aria-labelledby="warranty-summary-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="warranty-summary-title" className="font-display text-lg font-semibold">Prazos próximos</h2>
              <span className="qv-pill qv-pill-module">{upcomingWarranties.length}</span>
            </div>
            {upcomingWarranties.length === 0 ? (
              <EmptyState>Nenhuma garantia vencendo. Cadastre garantias para acompanhar prazos sem perder uma data importante.</EmptyState>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingWarranties.map(({ warranty, days }) => (
                  <div key={warranty.id} className="flex items-center gap-3 rounded-[10px] border border-border px-3 py-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${days <= 30 ? "bg-warning" : "bg-success"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{warranty.product_name}</span>
                    <span className={`shrink-0 font-mono text-xs ${days <= 30 ? "text-warning" : "text-text-secondary"}`}>
                      {formatDistance(days)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatDocumentStorage(bytes: number): string {
  if (bytes > 0 && bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
