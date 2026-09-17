import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, Chip, EmptyState, Modal } from "@qqorvex/ui";
import {
  useLibraryItems,
  useCreateLibraryItemWithCreators,
  useUpdateItemStatus,
  useToggleFavorite,
  useDeleteLibraryItem,
  NewItemForm,
  GalleryGrid,
  LIBRARY_ITEM_TYPE_LABELS,
  type LibraryItemType,
} from "@qqorvex/module-biblioteca";
import { supabase } from "../app/supabase";

/** Rótulos no plural para os chips de filtro (mesma ordem de `LIBRARY_ITEM_TYPE_LABELS`). */
const TYPE_FILTER_LABELS: Record<LibraryItemType, string> = {
  book: "Livros",
  comic: "Quadrinhos",
  manga: "Mangás",
  movie: "Filmes",
  series: "Séries",
  anime: "Animes",
  podcast: "Podcasts",
  podcast_episode: "Episódios de podcast",
  video: "Vídeos",
  article: "Artigos",
  web_content: "Conteúdos web",
  course: "Cursos",
  academic_paper: "Artigos acadêmicos",
  game: "Jogos",
  other: "Outros",
};

type TypeFilter = LibraryItemType | "all";

export function BibliotecaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const { items, isLoading } = useLibraryItems(supabase);
  const createItem = useCreateLibraryItemWithCreators(supabase, userId);
  const updateStatus = useUpdateItemStatus(supabase);
  const toggleFavorite = useToggleFavorite(supabase);
  const deleteItem = useDeleteLibraryItem(supabase);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Só mostra chips de tipos que existem no acervo; se o último item de um tipo sair, volta pra "Tudo".
  const presentTypes = (Object.keys(LIBRARY_ITEM_TYPE_LABELS) as LibraryItemType[]).filter((type) =>
    items.some((item) => item.item_type === type),
  );
  const activeFilter: TypeFilter = typeFilter !== "all" && presentTypes.includes(typeFilter) ? typeFilter : "all";
  const visibleItems = activeFilter === "all" ? items : items.filter((item) => item.item_type === activeFilter);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-2 flex-wrap">
        {presentTypes.length > 0 && (
          <>
            <Chip active={activeFilter === "all"} onClick={() => setTypeFilter("all")}>
              Tudo
            </Chip>
            {presentTypes.map((type) => (
              <Chip key={type} active={activeFilter === type} onClick={() => setTypeFilter(type)}>
                {TYPE_FILTER_LABELS[type]}
              </Chip>
            ))}
          </>
        )}
        <span className="flex-1" />
        <Button type="button" variant="primary" onClick={() => setIsAddOpen(true)}>
          Adicionar item
        </Button>
      </div>

      {isLoading ? (
        <EmptyState>Carregando acervo...</EmptyState>
      ) : (
        <GalleryGrid
          items={visibleItems}
          onAdvanceStatus={(itemId, status) => updateStatus.mutate({ itemId, status })}
          onToggleFavorite={(itemId, isFavorite) => toggleFavorite.mutate({ itemId, isFavorite })}
          onDelete={(itemId) => deleteItem.mutate(itemId)}
        />
      )}

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Adicionar item" size="md">
        <NewItemForm
          items={items}
          onCreate={(input, creators) => {
            createItem.mutate({ input, creators });
            setIsAddOpen(false);
          }}
          tmdbApiKey={import.meta.env.VITE_TMDB_API_KEY}
        />
      </Modal>
    </div>
  );
}
