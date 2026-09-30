import { useMemo, useState, type FormEvent } from "react";
import { CloudIcon, FilesIcon, LockIcon, LockOpenIcon, MagnifyingGlassIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Badge, Button, EmptyState, Modal, Notice, PageContainer, PageHeader, ProgressBar, SkeletonList, Tabs, cx, useToast } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import {
  useDocuments,
  useDocumentStorageQuota,
  useUploadDocument,
  useDeleteDocument,
  useToggleImportant,
  useToggleVault,
  useLockVault,
  useUnlockVault,
  useVaultStatus,
  useFolders,
  useMoveDocumentToFolder,
  useUpdateDocumentType,
  useRenameDocument,
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
  normalizeDocumentRename,
  selectDocuments,
  type Document,
  type DocumentQuickFilter,
  type DocumentSortOrder,
} from "@qqorvex/module-documentos";
import { getDownloadUrl } from "@qqorvex/module-documentos";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";
import { useCurrentItem } from "../vex/CurrentItemContext";

type DocumentsView = "lista" | "arquivados" | "garantias" | "lixeira";

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
  const { toast } = useToast();
  usePageMeta({ title: "Documentos" });
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
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  // O Cofre é protegido no servidor: bloqueado, a lista nem traz os documentos dele.
  const vault = useVaultStatus(supabase);
  const unlockVault = useUnlockVault(supabase);
  const lockVault = useLockVault(supabase);
  const vaultUnlocked = vault.unlockedUntil !== null;
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ document: Document; draft: string } | null>(null);

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
  const renameDocument = useRenameDocument(supabase);
  const renamePreview = renaming ? normalizeDocumentRename(renaming.draft, renaming.document.file_name) : null;

  function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!renaming || !renamePreview) return;
    const { document } = renaming;
    if (renamePreview === document.file_name) {
      setRenaming(null);
      return;
    }
    renameDocument.mutate(
      { documentId: document.id, fileName: renamePreview },
      {
        onSuccess: () => {
          setRenaming(null);
          if (currentItem?.type === "documento" && currentItem.id === document.id) setCurrentItem({ type: "documento", id: document.id, label: renamePreview });
          toast({ title: "Documento renomeado", description: renamePreview, tone: "success" });
        },
      },
    );
  }
  const extractText = useExtractText(supabase);
  const setArchived = useSetDocumentArchived(supabase);

  const today = new Date();
  const vaultCount = vault.count;
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
    try {
      const unlockedUntil = await unlockVault.mutateAsync(pinInput.trim());
      if (!unlockedUntil) {
        // Depois de 5 erros o servidor recusa por 5 minutos, mesmo com o PIN certo.
        setPinError("PIN incorreto, ou bloqueado por alguns minutos após várias tentativas. O Cofre continua fechado.");
        return;
      }
      setPinInput("");
    } catch {
      setPinError("Não foi possível verificar o PIN agora. Confira a conexão e tente novamente.");
    }
  }

  /** Vencimento de um documento = garantia vinculada a ele (única data real que o módulo tem por documento). */
  function dueFor(documentId: string): { label: string; color: string } | undefined {
    const linked = warranties
      .filter((w) => w.document_id === documentId)
      .sort((a, b) => a.end_date.localeCompare(b.end_date))[0];
    if (!linked) return undefined;
    const days = daysUntil(linked.end_date, today);
    if (days < 0) return { label: "garantia vencida", color: "var(--q-danger)" };
    if (days <= 30) return { label: `vence em ${formatDistance(days)}`, color: "var(--q-warning)" };
    return { label: `garantia até ${formatMonthYear(linked.end_date)}`, color: "var(--q-success)" };
  }

  const storagePercent = storageQuota && storageQuota.quotaBytes ? Math.min(100, Math.round((storageQuota.usedBytes / storageQuota.quotaBytes) * 100)) : null;
  const clearFilters = () => {
    setSearch("");
    setSelectedFolderId(null);
    setSelectedType("");
    setQuickFilter("all");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Documentos"
        description={
          isLoading
            ? "Carregando…"
            : `${allDocuments.length} ${allDocuments.length === 1 ? "arquivo" : "arquivos"}${storageQuota ? ` · ${formatDocumentStorage(storageQuota.usedBytes)} de ${formatDocumentStorage(storageQuota.quotaBytes)} usados` : ""}`
        }
        actions={
          <Button leadingIcon={<UploadSimpleIcon size={16} />} onClick={() => setIsUploadDialogOpen(true)}>
            Adicionar arquivo
          </Button>
        }
      >
        <Tabs<DocumentsView>
          label="Seções"
          value={view}
          onChange={setView}
          options={[
            { value: "lista", label: "Arquivos", count: allDocuments.length || null },
            { value: "arquivados", label: "Arquivados" },
            { value: "garantias", label: "Garantias", count: warranties.length || null },
            { value: "lixeira", label: "Lixeira" },
          ]}
        />
      </PageHeader>

      <Modal
        isOpen={isUploadDialogOpen}
        onClose={() => {
          if (!uploadDocument.isPending) setIsUploadDialogOpen(false);
        }}
        title="Adicionar arquivo"
        description={storageQuota ? `Até ${formatDocumentStorage(storageQuota.maxFileBytes)} por arquivo · ${formatDocumentStorage(Math.max(0, storageQuota.quotaBytes - storageQuota.usedBytes))} livres` : "Arraste um arquivo ou escolha do dispositivo."}
        size="lg"
        icon={<UploadSimpleIcon />}
      >
        <UploadForm
          isUploading={uploadDocument.isPending}
          folders={folders}
          folderId={uploadFolderId}
          onFolderChange={setUploadFolderId}
          onUpload={async (file, documentType, options) => {
            await uploadDocument.mutateAsync({ file, fileName: file.name, documentType, force: options?.force, folderId: options?.folderId });
            setIsUploadDialogOpen(false);
            toast({ title: "Arquivo enviado", description: file.name, tone: "success" });
          }}
        />
      </Modal>

      {view === "lixeira" ? (
        <TrashPanel client={supabase} />
      ) : view === "garantias" ? (
        <WarrantiesPanel client={supabase} userId={userId} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <div className="relative col-span-2 min-w-[200px] sm:flex-1">
                <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, tipo ou texto do arquivo" aria-label="Buscar documentos" data-size="sm" className="q-input pl-8!" />
              </div>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} aria-label="Filtrar por tipo" data-size="sm" className="q-input sm:w-auto">
                <option value="">Todos os tipos</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as DocumentSortOrder)} aria-label="Ordenar documentos" data-size="sm" className="q-input sm:w-auto">
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="name">Nome A–Z</option>
                <option value="largest">Maior tamanho</option>
              </select>
            </div>

            {view === "lista" && (
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros rápidos">
                {[
                  { label: "Todos", value: allDocuments.length, filter: "all" as const },
                  { label: "Importantes", value: importantCount, filter: "important" as const },
                  { label: "No Cofre", value: vaultCount, filter: "vault" as const },
                  { label: "Últimos 7 dias", value: recentCount, filter: "recent" as const },
                ].map(({ label, value, filter }) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={quickFilter === filter}
                    onClick={() => activateQuickFilter(filter)}
                    className={cx("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors", quickFilter === filter ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line text-fg-2 hover:bg-hover hover:text-fg")}
                  >
                    {label}
                    <span className="tabular-nums text-fg-4">{value}</span>
                  </button>
                ))}
              </div>
            )}

            <FoldersPanel
              client={supabase}
              userId={userId}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(folderId) => {
                setSelectedFolderId(folderId);
                if (view !== "arquivados") setUploadFolderId(folderId ?? "");
              }}
            />

            {extractError && <Notice title="Não foi possível ler o texto da imagem">{extractError}</Notice>}
            {setArchived.error && <Notice title="Não foi possível arquivar">O arquivo continua na lista. Tente de novo.</Notice>}
            {activeDocumentsError && sourceDocuments.length > 0 && <Notice tone="warning" title="Mostrando a última lista carregada">A atualização falhou; os arquivos já carregados continuam aqui.</Notice>}

            <section className="overflow-hidden rounded-xl border border-line bg-surface" aria-label={view === "arquivados" ? "Documentos arquivados" : "Seus arquivos"}>
              {activeDocumentsError && sourceDocuments.length === 0 ? (
                <Notice
                  title="Não foi possível carregar seus documentos"
                  className="m-4"
                  actions={
                    <Button variant="secondary" size="sm" onClick={() => void retryDocuments()}>
                      Tentar de novo
                    </Button>
                  }
                >
                  Seus arquivos continuam guardados. Confira a conexão.
                </Notice>
              ) : activeDocumentsLoading && sourceDocuments.length === 0 ? (
                <SkeletonList rows={4} leading />
              ) : documents.length === 0 ? (
                <EmptyState
                  icon={<FilesIcon />}
                  title={view === "arquivados" && archivedDocuments.length === 0 ? "Nada arquivado" : sourceDocuments.length === 0 ? "Nenhum documento ainda" : "Nada encontrado"}
                  description={
                    view === "arquivados" && archivedDocuments.length === 0
                      ? "Arquive arquivos que não usa mais para deixar a lista limpa sem apagar nada."
                      : sourceDocuments.length === 0
                        ? "Guarde contratos, notas fiscais, receitas, comprovantes e documentos pessoais. Imagens podem ter o texto extraído para busca."
                        : "Ajuste a busca ou os filtros."
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="secondary" size="sm" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    ) : sourceDocuments.length === 0 && view === "lista" ? (
                      <Button leadingIcon={<UploadSimpleIcon size={16} />} onClick={() => setIsUploadDialogOpen(true)}>
                        Adicionar arquivo
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                documents.map((document) =>
                  versionsDocumentId === document.id ? (
                    <VersionHistoryPanel key={document.id} client={supabase} document={document} onClose={() => setVersionsDocumentId(null)} />
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
                      onRename={() => setRenaming({ document, draft: document.file_name })}
                      onToggleImportant={() => toggleImportant.mutate({ documentId: document.id, isImportant: !document.is_important })}
                      onToggleVault={() =>
                        toggleVault.mutate(
                          { documentId: document.id, isVault: !document.is_vault },
                          {
                            onSuccess: () => {
                              if (!document.is_vault && !vaultUnlocked) {
                                toast({ title: "Guardado no Cofre", description: "Ele sai da lista até você abrir o Cofre com o PIN.", tone: "success" });
                              }
                            },
                            onError: () => toast({ title: "Não foi possível mudar o Cofre deste documento", tone: "danger" }),
                          },
                        )
                      }
                      onDelete={() => deleteDocument.mutate(document.id, { onSuccess: () => toast({ title: "Movido para a lixeira", description: `Fica lá por 30 dias.`, tone: "success" }) })}
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
                        currentItem?.type === "documento" && currentItem.id === document.id ? setCurrentItem(null) : setCurrentItem({ type: "documento", id: document.id, label: document.file_name })
                      }
                    />
                  ),
                )
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            {vaultCount > 0 && (
              <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="vault-title">
                <div className="flex items-center gap-2">
                  {vaultUnlocked ? <LockOpenIcon size={17} className="text-success" /> : <LockIcon size={17} className="text-warning" />}
                  <h2 id="vault-title" className="flex-1 text-[14px] font-semibold text-fg">
                    Cofre
                  </h2>
                  <Badge tone={vaultUnlocked ? "success" : "warning"}>{vaultUnlocked ? "Aberto" : "Bloqueado"}</Badge>
                </div>
                {vaultUnlocked && vault.unlockedUntil ? (
                  <div className="mt-2">
                    <p className="text-[13px] text-fg-2">
                      {vaultCount} {vaultCount === 1 ? "documento visível" : "documentos visíveis"} nesta sessão, até{" "}
                      <span className="tabular-nums text-fg">{new Date(vault.unlockedUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>.
                    </p>
                    <Button variant="secondary" size="sm" className="mt-3" leadingIcon={<LockIcon size={14} />} loading={lockVault.isPending} onClick={() => lockVault.mutate()}>
                      Bloquear agora
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg-2">
                      {vaultCount} {vaultCount === 1 ? "documento fica guardado" : "documentos ficam guardados"} até você digitar o PIN de segurança. O acesso vale por 15 minutos e só neste aparelho.
                    </p>
                    <form onSubmit={handleUnlockVault} className="mt-3 flex gap-2">
                      <input type="password" inputMode="numeric" autoComplete="off" value={pinInput} onChange={(event) => setPinInput(event.target.value)} placeholder="PIN" aria-label="PIN do Cofre" aria-invalid={pinError ? true : undefined} data-size="sm" className="q-input flex-1 font-mono tracking-[.3em]" />
                      <Button type="submit" size="sm" disabled={!pinInput.trim()} loading={unlockVault.isPending}>
                        Abrir
                      </Button>
                    </form>
                    {pinError && <p className="mt-2 text-xs text-danger">{pinError}</p>}
                  </>
                )}
              </section>
            )}

            <section className="rounded-xl border border-line bg-surface" aria-labelledby="warranty-summary-title">
              <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 id="warranty-summary-title" className="text-[14px] font-semibold text-fg">
                  Garantias a vencer
                </h2>
                <button type="button" onClick={() => setView("garantias")} className="text-xs text-fg-3 hover:text-fg">
                  Ver todas
                </button>
              </header>
              {upcomingWarranties.length === 0 ? (
                <p className="px-4 py-4 text-[13px] leading-relaxed text-fg-3">Cadastre garantias de produtos para ser avisado antes de vencerem.</p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {upcomingWarranties.map(({ warranty, days }) => (
                    <li key={warranty.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={cx("h-2 w-2 shrink-0 rounded-full", days <= 30 ? "bg-warning" : "bg-success")} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{warranty.product_name}</span>
                      <span className={cx("shrink-0 text-xs tabular-nums", days <= 30 ? "text-warning" : "text-fg-3")}>{formatDistance(days)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {storageQuota && storagePercent !== null && (
              <section className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-semibold text-fg">
                    <CloudIcon size={16} className="text-fg-3" /> Armazenamento
                  </span>
                  <span className="text-xs tabular-nums text-fg-3">{storagePercent}%</span>
                </div>
                <ProgressBar value={storagePercent} height={5} tone={storagePercent > 90 ? "danger" : storagePercent > 75 ? "warning" : "gold"} label="Armazenamento usado" />
                <p className="mt-2 text-xs text-fg-3">
                  {formatDocumentStorage(storageQuota.usedBytes)} de {formatDocumentStorage(storageQuota.quotaBytes)} · privado e criptografado no envio
                </p>
              </section>
            )}
          </aside>
        </div>
      )}

      <Modal
        isOpen={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Renomear documento"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="rename-document-form" disabled={!renamePreview} loading={renameDocument.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        {renaming && (
          <form id="rename-document-form" onSubmit={handleRename} className="flex flex-col gap-2">
            <label htmlFor="rename-document-input" className="text-[13px] font-medium text-fg-2">
              Nome
            </label>
            <input
              id="rename-document-input"
              value={renaming.draft}
              onChange={(event) => setRenaming({ document: renaming.document, draft: event.target.value })}
              maxLength={200}
              data-autofocus
              className="q-input"
            />
            {renamePreview && renamePreview !== renaming.draft.trim() && (
              <p className="text-xs text-fg-3">
                Vai ficar: <span className="text-fg">{renamePreview}</span>
              </p>
            )}
            {renameDocument.isError && <p role="alert" className="text-xs text-danger">Não foi possível renomear. Tente de novo.</p>}
          </form>
        )}
      </Modal>
    </PageContainer>
  );
}

function formatDocumentStorage(bytes: number): string {
  if (bytes > 0 && bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
