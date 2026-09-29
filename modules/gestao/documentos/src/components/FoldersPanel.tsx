import { useState, type FormEvent, type ReactNode } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Chip, Skeleton } from "@qqorvex/ui";
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
        <span role="status" aria-label="Carregando" className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </span>
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
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 hover:text-danger"
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
            className="q-input w-44 py-[7px] px-3 text-[13px]"
          />
          <Button type="submit" variant="primary" size="sm" disabled={createFolder.isPending}>
            Criar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setIsCreating(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 h-9 px-3.5 text-[13.5px] border border-dashed border-line-strong text-fg-2 hover:border-fg-3 hover:text-fg rounded-full px-4 py-2">
          + Nova pasta
        </button>
      )}
      <span className="flex-1" />
      {actions}
    </div>
  );
}
