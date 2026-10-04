import type { LibraryItemType } from "./types";

/**
 * Metadata Provider Layer — busca
 * automática de metadados por título. Livro (Google Books, sem chave) e filme/série/anime (TMDB,
 * chave pública em `VITE_TMDB_API_KEY` — dado de filme é público, sem risco real em expor a
 * chave no cliente, mesmo padrão de `VITE_GOOGLE_CLIENT_ID`). Chamadas diretas do cliente, sem
 * Edge Function — nenhuma das duas exige segredo de verdade pra proteger.
 */
export interface MetadataSearchResult {
  title: string;
  subtitle?: string;
  description?: string;
  year?: number;
  coverUrl?: string;
  originUrl?: string;
  creators?: { name: string; role: string }[];
}

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    description?: string;
    publishedDate?: string;
    authors?: string[];
    imageLinks?: { thumbnail?: string };
    infoLink?: string;
  };
}

async function searchGoogleBooks(query: string): Promise<MetadataSearchResult[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Books respondeu ${response.status}`);
  const data = (await response.json()) as { items?: GoogleBooksVolume[] };
  return (data.items ?? []).map((item) => {
    const info = item.volumeInfo ?? {};
    return {
      title: info.title ?? query,
      subtitle: info.subtitle,
      description: info.description,
      year: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || undefined : undefined,
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
      originUrl: info.infoLink,
      creators: (info.authors ?? []).map((name) => ({ name, role: "autor" })),
    };
  });
}

interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

/**
 * TMDB não devolve diretor/elenco na busca (exigiria uma segunda chamada a `/credits` por item —
 * custo/complexidade desproporcional pra v1). Filme/série ficam sem `creators` por enquanto.
 */
async function searchTmdb(query: string, type: "movie" | "series", apiKey: string): Promise<MetadataSearchResult[]> {
  if (!apiKey) return [];
  const endpoint = type === "movie" ? "movie" : "tv";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TMDB respondeu ${response.status}`);
  const data = (await response.json()) as { results?: TmdbResult[] };
  return (data.results ?? []).slice(0, 8).map((item) => {
    const title = (type === "movie" ? item.title : item.name) ?? query;
    const dateStr = type === "movie" ? item.release_date : item.first_air_date;
    return {
      title,
      description: item.overview,
      year: dateStr ? Number(dateStr.slice(0, 4)) || undefined : undefined,
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : undefined,
      originUrl: `https://www.themoviedb.org/${endpoint}/${item.id}`,
    };
  });
}

/** Busca centralizada usada pelo formulário e pela Vex — uma única regra de provedor por tipo. */
export async function searchLibraryMetadata(query: string, itemType: LibraryItemType, tmdbApiKey = ""): Promise<MetadataSearchResult[]> {
  if (itemType === "book") return searchGoogleBooks(query);
  if (itemType === "movie") return searchTmdb(query, "movie", tmdbApiKey);
  if (itemType === "series") return searchTmdb(query, "series", tmdbApiKey);
  if (itemType === "anime") {
    const seriesResults = await searchTmdb(query, "series", tmdbApiKey);
    return seriesResults.length > 0 ? seriesResults : searchTmdb(query, "movie", tmdbApiKey);
  }
  return [];
}

function normalizeMetadataTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Evita associar automaticamente uma capa errada: só escolhe título exato ou uma única opção.
 * Ambiguidade continua disponível para seleção manual no formulário.
 */
export function selectBestLibraryMetadata(query: string, results: MetadataSearchResult[]): MetadataSearchResult | null {
  if (results.length === 0) return null;
  const normalizedQuery = normalizeMetadataTitle(query);
  return results.find((result) => normalizeMetadataTitle(result.title) === normalizedQuery) ?? (results.length === 1 ? results[0]! : null);
}
