import { useState, type FormEvent } from "react";
import { Button, Input, Select } from "@qqorvex/ui";
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

export function DocumentosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [showTrash, setShowTrash] = useState(false);
  const [showWarranties, setShowWarranties] = useState(false);
  const [versionsDocumentId, setVersionsDocumentId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const { currentItem, setCurrentItem } = useCurrentItem();
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);

  const { documents: allDocuments, isLoading } = useDocuments(supabase);
  const { folders } = useFolders(supabase);
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

  const hasLockedVaultDocument = documents.some((d) => d.is_vault) && !vaultUnlocked;

  async function handleUnlockVault(event: FormEvent) {
    event.preventDefault();
    setPinError(null);
    setPinBusy(true);
    const isCorrect = await verifySecurityPin(supabase, pinInput.trim());
    setPinBusy(false);
    if (!isCorrect) {
      setPinError("PIN incorreto.");
      return;
    }
    setVaultUnlocked(true);
    setShowUnlockForm(false);
    setPinInput("");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Documentos</h1>
      </div>

      <div className="w-full max-w-2xl">
        <UploadForm
          isUploading={uploadDocument.isPending}
          onUpload={async (file, documentType, options) => {
            await uploadDocument.mutateAsync({ file, fileName: file.name, documentType, force: options?.force });
          }}
        />
      </div>

      <div className="w-full max-w-2xl flex justify-end gap-2">
        {hasLockedVaultDocument && !showUnlockForm && (
          <Button type="button" variant="chip" onClick={() => setShowUnlockForm(true)}>
            🔒 Desbloquear Cofre
          </Button>
        )}
        <Button type="button" variant="chip" onClick={() => setShowWarranties((v) => !v)}>
          {showWarranties ? "Voltar para Documentos" : "Ver Garantias"}
        </Button>
        <Button type="button" variant="chip" onClick={() => setShowTrash((v) => !v)}>
          {showTrash ? "Voltar para Documentos" : "Ver Lixeira"}
        </Button>
      </div>

      {showUnlockForm && (
        <form onSubmit={handleUnlockVault} className="w-full max-w-2xl flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="PIN do Cofre"
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" variant="primary" disabled={pinBusy}>
            Desbloquear
          </Button>
          {pinError && <p className="font-sans text-sm text-error self-center">{pinError}</p>}
        </form>
      )}

      {!showTrash && !showWarranties && (
        <div className="w-full max-w-2xl flex flex-col gap-2">
          <FoldersPanel
            client={supabase}
            userId={userId}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
          />
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="self-start rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="w-full max-w-2xl flex flex-col gap-2">
        {showTrash ? (
          <TrashPanel client={supabase} />
        ) : showWarranties ? (
          <WarrantiesPanel client={supabase} userId={userId} />
        ) : isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : documents.length === 0 ? (
          <p className="font-sans text-text-secondary-warm">Nenhum documento ainda.</p>
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
                onFocus={() => setCurrentItem({ type: "documento", id: document.id, label: document.file_name })}
                isMasked={document.is_vault && !vaultUnlocked}
              />
            ),
          )
        )}
      </div>
    </main>
  );
}
