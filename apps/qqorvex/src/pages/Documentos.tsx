import { useState, type FormEvent } from "react";
import { Button, EmptyState } from "@qqorvex/ui";
import { useAuth, verifySecurityPin } from "@qqorvex/auth";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useToggleImportant,
  useToggleVault,
  useFolders,
  useMoveDocumentToFolder,
  useUpdateDocumentType,
  useExtractText,
  useWarranties,
  DOCUMENT_TYPE_LABELS,
  UploadForm,
  DocumentCard,
  TrashPanel,
  VersionHistoryPanel,
  FoldersPanel,
  WarrantiesPanel,
} from "@qqorvex/module-documentos";
import { getDownloadUrl } from "@qqorvex/module-documentos";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";

type DocumentsView = "lista" | "garantias" | "lixeira";

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
  const { currentItem, setCurrentItem } = useCurrentItem();
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);

  const { documents: allDocuments, isLoading } = useDocuments(supabase);
  const { folders } = useFolders(supabase);
  const { warranties } = useWarranties(supabase);
  const documents = allDocuments
    .filter((d) => !selectedFolderId || d.folder_id === selectedFolderId)
    .filter((d) => !selectedType || d.document_type === selectedType);
  const uploadDocument = useUploadDocument(supabase, userId);
  const deleteDocument = useDeleteDocument(supabase);
  const toggleImportant = useToggleImportant(supabase);
  const toggleVault = useToggleVault(supabase);
  const moveToFolder = useMoveDocumentToFolder(supabase);
  const updateType = useUpdateDocumentType(supabase);
  const extractText = useExtractText(supabase);

  const today = new Date();
  const vaultCount = allDocuments.filter((d) => d.is_vault).length;
  const upcomingWarranties = warranties
    .map((w) => ({ warranty: w, days: daysUntil(w.end_date, today) }))
    .filter((w) => w.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  async function handleExtractText(documentId: string, storagePath: string) {
    setExtractingDocumentId(documentId);
    setExtractProgress(0);
    try {
      const imageUrl = await getDownloadUrl(supabase, storagePath);
      await extractText.mutateAsync({
        documentId,
        imageUrl,
        onProgress: setExtractProgress,
      });
    } finally {
      setExtractingDocumentId(null);
    }
  }

  async function handleUnlockVault(event: FormEvent) {
    event.preventDefault();
    setPinError(null);
    setPinBusy(true);
    const isCorrect = await verifySecurityPin(supabase, pinInput.trim());
    setPinBusy(false);
    if (!isCorrect) {
      setPinError("PIN incorreto. O Cofre continua bloqueado.");
      return;
    }
    setVaultUnlocked(true);
    setPinInput("");
  }

  /** Vencimento de um documento = garantia vinculada a ele (única data real que o módulo tem por documento). */
  function dueFor(documentId: string): { label: string; color: string } | undefined {
    const linked = warranties
      .filter((w) => w.document_id === documentId)
      .sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0];
    if (!linked) return undefined;
    const days = daysUntil(linked.end_date, today);
    if (days < 0) return { label: "garantia vencida", color: "var(--color-error)" };
    if (days <= 30) return { label: `vence em ${formatDistance(days)}`, color: "var(--color-warning)" };
    return { label: `garantia até ${formatMonthYear(linked.end_date)}`, color: "var(--color-success)" };
  }

  function toggleView(next: DocumentsView) {
    setView((current) => (current === next ? "lista" : next));
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <UploadForm
        isUploading={uploadDocument.isPending}
        onUpload={async (file, documentType, options) => {
          await uploadDocument.mutateAsync({ file, fileName: file.name, documentType, force: options?.force });
        }}
      />

      <FoldersPanel
        client={supabase}
        userId={userId}
        selectedFolderId={selectedFolderId}
        onSelectFolder={(folderId) => {
          setSelectedFolderId(folderId);
          setView("lista");
        }}
        actions={
          <>
            <select
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value);
                setView("lista");
              }}
              aria-label="Filtrar por tipo"
              className="qv-field w-auto py-2 px-3 text-[13px] text-text-secondary"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant={view === "garantias" ? "vex" : "quiet"}
              size="sm"
              className="py-2"
              aria-pressed={view === "garantias"}
              onClick={() => toggleView("garantias")}
            >
              Garantias
            </Button>
            <Button
              type="button"
              variant={view === "lixeira" ? "vex" : "quiet"}
              size="sm"
              className="py-2"
              aria-pressed={view === "lixeira"}
              onClick={() => toggleView("lixeira")}
            >
              Lixeira
            </Button>
          </>
        }
      />

      <div className="grid gap-5 items-start grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
        {view === "lixeira" ? (
          <TrashPanel client={supabase} />
        ) : view === "garantias" ? (
          <WarrantiesPanel client={supabase} userId={userId} />
        ) : (
          <div className="qv-card overflow-hidden">
            {isLoading ? (
              <EmptyState className="px-5 py-4">Carregando documentos...</EmptyState>
            ) : documents.length === 0 ? (
              <EmptyState className="px-5 py-4">
                {allDocuments.length === 0
                  ? "Nenhum documento ainda. Envie o primeiro arquivo pela área acima."
                  : "Nenhum documento neste filtro. Troque a pasta ou o tipo para ver os demais."}
              </EmptyState>
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
                      window.open(url, "_blank");
                    }}
                    onToggleImportant={() =>
                      toggleImportant.mutate({ documentId: document.id, isImportant: !document.is_important })
                    }
                    onToggleVault={() => toggleVault.mutate({ documentId: document.id, isVault: !document.is_vault })}
                    onDelete={() => deleteDocument.mutate(document.id)}
                    onOpenVersions={() => setVersionsDocumentId(document.id)}
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
          </div>
        )}

        <div className="flex flex-col gap-4">
          {vaultCount > 0 && (
            <div className="qv-card p-[18px] flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">Cofre</span>
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
            </div>
          )}

          <div className="qv-card p-[18px] flex flex-col gap-[10px]">
            <span className="text-[15px] font-semibold">Vencendo</span>
            {upcomingWarranties.length === 0 ? (
              <EmptyState>Nenhuma garantia vencendo. Cadastre garantias para acompanhar prazos aqui.</EmptyState>
            ) : (
              <div className="flex flex-col gap-[9px]">
                {upcomingWarranties.map(({ warranty, days }) => (
                  <div key={warranty.id} className="flex gap-[10px] items-baseline">
                    <span className="flex-1 min-w-0 text-[13px] truncate">Garantia — {warranty.product_name}</span>
                    <span className={`font-mono text-xs shrink-0 ${days <= 30 ? "text-warning" : "text-text-secondary"}`}>
                      {formatDistance(days)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
