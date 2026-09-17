import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@qqorvex/auth";
import { Chip, EmptyState } from "@qqorvex/ui";
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

  const linkTitlesByPage = useMemo(() => {
    const titleById = new Map(pages.map((p) => [p.id, p.title]));
    const result = new Map<string, string[]>();
    for (const link of links) {
      const targetTitle = titleById.get(link.target_page_id);
      if (!targetTitle) continue;
      const list = result.get(link.source_page_id) ?? [];
      list.push(targetTitle);
      result.set(link.source_page_id, list);
    }
    return result;
  }, [pages, links]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <NewPageForm onCreate={(title) => createPage.mutate({ title })} />
        <div className="flex items-center gap-[10px]" role="tablist">
          {(Object.keys(VIEW_LABEL) as ViewMode[]).map((view) => (
            <Chip key={view} role="tab" active={viewMode === view} onClick={() => setViewMode(view)}>
              {VIEW_LABEL[view]}
            </Chip>
          ))}
        </div>
      </div>

      {viewMode === "bases" ? (
        <BasesPanel client={supabase} userId={userId} />
      ) : isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : viewMode === "grafo" ? (
        <GraphView pages={pages} links={links} onSelectPage={(pageId) => navigate(`/segundo-cerebro/${pageId}`)} />
      ) : pages.length === 0 ? (
        <EmptyState>Nenhuma página ainda. Dê um título acima e crie a primeira.</EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              linkTitles={linkTitlesByPage.get(page.id)}
              onDelete={() => deletePage.mutate(page.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
