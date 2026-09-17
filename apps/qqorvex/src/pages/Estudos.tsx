import { useAuth } from "@qqorvex/auth";
import { EmptyState } from "@qqorvex/ui";
import { useNotebooks, useCreateNotebook, useDeleteNotebook, NewNotebookForm, NotebookCard } from "@qqorvex/module-estudos";
import { supabase } from "../app/supabase";

export function EstudosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const { notebooks, isLoading } = useNotebooks(supabase);
  const createNotebook = useCreateNotebook(supabase, userId);
  const deleteNotebook = useDeleteNotebook(supabase);

  return (
    <div className="flex flex-col gap-[18px]">
      <NewNotebookForm onCreate={(name) => createNotebook.mutate({ name })} />

      {isLoading ? (
        <EmptyState>Carregando cadernos...</EmptyState>
      ) : notebooks.length === 0 ? (
        <EmptyState>Nenhum caderno ainda. Crie o primeiro com o nome de uma matéria, curso ou prova.</EmptyState>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
          {notebooks.map((notebook) => (
            <NotebookCard key={notebook.id} notebook={notebook} onDelete={() => deleteNotebook.mutate(notebook.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
