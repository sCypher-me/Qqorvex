import { useAuth } from "@qqorvex/auth";
import { useNotebooks, useCreateNotebook, useDeleteNotebook, NewNotebookForm, NotebookCard } from "@qqorvex/module-estudos";
import { supabase } from "../app/supabase";

export function EstudosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const { notebooks, isLoading } = useNotebooks(supabase);
  const createNotebook = useCreateNotebook(supabase, userId);
  const deleteNotebook = useDeleteNotebook(supabase);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Estudos</h1>
      </div>

      <div className="w-full max-w-2xl">
        <NewNotebookForm onCreate={(name) => createNotebook.mutate({ name })} />
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-2">
        {isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : notebooks.length === 0 ? (
          <p className="font-sans text-text-secondary-warm">Nenhum Caderno ainda.</p>
        ) : (
          notebooks.map((notebook) => (
            <NotebookCard key={notebook.id} notebook={notebook} onDelete={() => deleteNotebook.mutate(notebook.id)} />
          ))
        )}
      </div>
    </main>
  );
}
