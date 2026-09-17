import { useState, type FormEvent, type ReactNode } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Chip } from "@qqorvex/ui";
import { useCreateFolder, useDeleteFolder, useFolders } from "../hooks/useDocumentos";

/**
 * "Pastas" como área dedicada — cria/lista/exclui e permite filtrar a listagem de Documentos por pasta.
 * Visual: fileira de chips; `actions` (ex.: Garantias/Lixeira) ficam alinhadas à direita.
 */
export function FoldersPanel({
  client,
  userId,
  selectedFolderId,
  onSelectFolder,
  actions,
}: {
  client: SupabaseClient<Database>;
  userId: string;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  actions?: ReactNode;
}) {
  const { folders, isLoading } = useFolders(client);
  const createFolder = useCreateFolder(client, userId);
  const deleteFolder = useDeleteFolder(client);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createFolder.mutate(name.trim());
    setName("");
    setIsCreating(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip active={selectedFolderId === null} onClick={() => onSelectFolder(null)}>
        Todos
      </Chip>
      {isLoading ? (
        <span className="text-[13px] text-text-muted">Carregando pastas...</span>
      ) : (
        folders.map((folder) =>
          selectedFolderId === folder.id ? (
            <span key={folder.id} className="inline-flex items-center gap-1">
              <Chip active onClick={() => onSelectFolder(folder.id)}>
                {folder.name}
              </Chip>
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(null);
                  deleteFolder.mutate(folder.id);
                }}
                className="qv-icon-btn hover:text-error"
                title="Excluir pasta"
                aria-label={`Excluir pasta ${folder.name}`}
              >
                ✕
              </button>
            </span>
          ) : (
            <Chip key={folder.id} onClick={() => onSelectFolder(folder.id)}>
              {folder.name}
            </Chip>
          ),
        )
      )}
      {isCreating ? (
        <form onSubmit={handleCreate} className="inline-flex items-center gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsCreating(false);
            }}
            placeholder="Nome da pasta"
            aria-label="Nome da nova pasta"
            autoFocus
            className="qv-field w-44 py-[7px] px-3 text-[13px]"
          />
          <Button type="submit" variant="primary" size="sm" disabled={createFolder.isPending}>
            Criar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setIsCreating(true)} className="qv-btn qv-btn-dashed rounded-full px-4 py-2">
          + Nova pasta
        </button>
      )}
      <span className="flex-1" />
      {actions}
    </div>
  );
}
