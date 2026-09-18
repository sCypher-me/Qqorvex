import { useAuth } from "@qqorvex/auth";
import { EmptyState, Skeleton } from "@qqorvex/ui";
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
        <div role="status" aria-label="Carregando" className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
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
