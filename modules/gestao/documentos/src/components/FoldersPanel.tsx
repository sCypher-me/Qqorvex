import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCreateFolder, useDeleteFolder, useFolders } from "../hooks/useDocumentos";

/** "Pastas" como área dedicada — cria/lista/exclui e permite filtrar a listagem de Documentos por pasta. */
export function FoldersPanel({
  client,
  userId,
  selectedFolderId,
  onSelectFolder,
}: {
  client: SupabaseClient<Database>;
  userId: string;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}) {
  const { folders, isLoading } = useFolders(client);
  const createFolder = useCreateFolder(client, userId);
  const deleteFolder = useDeleteFolder(client);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-sm font-semibold text-text-secondary-warm">Pastas</h3>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nova pasta"
          className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        />
        <Button
          variant="secondary"
          onClick={() => {
            if (!name.trim()) return;
            createFolder.mutate(name.trim());
            setName("");
          }}
        >
          Criar
        </Button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando pastas...</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className={`text-xs px-2 py-1 rounded-md border ${
                selectedFolderId === null ? "border-primary text-primary" : "border-border text-text-primary"
              } hover:bg-surface-1`}
            >
              Todas
            </button>
          </li>
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={`text-xs px-2 py-1 rounded-md border ${
                  selectedFolderId === folder.id ? "border-primary text-primary" : "border-border text-text-primary"
                } hover:bg-surface-1`}
              >
                {folder.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedFolderId === folder.id) onSelectFolder(null);
                  deleteFolder.mutate(folder.id);
                }}
                className="text-xs px-1 text-text-secondary-warm hover:text-error"
                title="Excluir pasta"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
