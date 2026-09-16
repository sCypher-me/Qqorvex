import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@qqorvex/auth";
import { Button } from "@qqorvex/ui";
import {
  usePages,
  useAllPageLinks,
  useCreatePage,
  useDeletePage,
  NewPageForm,
  PageCard,
  GraphView,
  BasesPanel,
} from "@qqorvex/module-segundo-cerebro";
import { supabase } from "../app/supabase";

type ViewMode = "lista" | "grafo" | "bases";

const VIEW_LABEL: Record<ViewMode, string> = { lista: "Lista", grafo: "Grafo", bases: "Bases" };

export function SegundoCerebroPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  const { pages, isLoading } = usePages(supabase);
  const { links } = useAllPageLinks(supabase);
  const createPage = useCreatePage(supabase, userId);
  const deletePage = useDeletePage(supabase);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Segundo Cérebro</h1>
      </div>

      <div className="w-full max-w-2xl">
        <NewPageForm onCreate={(title) => createPage.mutate({ title })} />
      </div>

      <div className="w-full max-w-2xl flex gap-2">
        {(Object.keys(VIEW_LABEL) as ViewMode[]).map((view) => (
          <Button key={view} type="button" variant={viewMode === view ? "chip-accent" : "chip"} onClick={() => setViewMode(view)}>
            {VIEW_LABEL[view]}
          </Button>
        ))}
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-2">
        {viewMode === "bases" ? (
          <BasesPanel client={supabase} userId={userId} />
        ) : isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : viewMode === "grafo" ? (
          <GraphView pages={pages} links={links} onSelectPage={(pageId) => navigate(`/segundo-cerebro/${pageId}`)} />
        ) : pages.length === 0 ? (
          <p className="font-sans text-text-secondary-warm">Nenhuma página ainda.</p>
        ) : (
          pages.map((page) => <PageCard key={page.id} page={page} onDelete={() => deletePage.mutate(page.id)} />)
        )}
      </div>
    </main>
  );
}
