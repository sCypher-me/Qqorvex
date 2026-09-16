import { useAuth } from "@qqorvex/auth";
import {
  useLibraryItems,
  useCreateLibraryItemWithCreators,
  useUpdateItemStatus,
  useToggleFavorite,
  useDeleteLibraryItem,
  NewItemForm,
  GalleryGrid,
} from "@qqorvex/module-biblioteca";
import { supabase } from "../app/supabase";

export function BibliotecaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const { items, isLoading } = useLibraryItems(supabase);
  const createItem = useCreateLibraryItemWithCreators(supabase, userId);
  const updateStatus = useUpdateItemStatus(supabase);
  const toggleFavorite = useToggleFavorite(supabase);
  const deleteItem = useDeleteLibraryItem(supabase);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Biblioteca</h1>
      </div>

      <div className="w-full max-w-4xl">
        <NewItemForm
          items={items}
          onCreate={(input, creators) => createItem.mutate({ input, creators })}
          tmdbApiKey={import.meta.env.VITE_TMDB_API_KEY}
        />
      </div>

      <div className="w-full max-w-4xl">
        {isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : (
          <GalleryGrid
            items={items}
            onAdvanceStatus={(itemId, status) => updateStatus.mutate({ itemId, status })}
            onToggleFavorite={(itemId, isFavorite) => toggleFavorite.mutate({ itemId, isFavorite })}
            onDelete={(itemId) => deleteItem.mutate(itemId)}
          />
        )}
      </div>
    </main>
  );
}
