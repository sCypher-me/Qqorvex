# Biblioteca — Metadata Provider Layer

Data: 12/09/2026. Classificação: **bounded** (schema já existia, sem função de repositório/UI —
não é uma tabela nova nem uma reestruturação de módulo).

## Problema

`NewItemForm` só pedia um título e sempre gravava `item_type: "other"` — sem seletor de tipo, sem
capa, sem autor/diretor, sem ano. `library_items` já tinha as colunas `cover_url`, `description`,
`year`, `origin_url`, `subtitle` desde o schema original, e `library_item_creators` (autor/
diretor/elenco) também já existia — nenhuma das duas nunca teve código de repositório ou UI.

## Escopo

Busca automática de metadados por título, só para os tipos onde existe uma API pública e
confiável:

- **Livro** → Google Books API (`https://www.googleapis.com/books/v1/volumes`), sem chave.
- **Filme/série** → TMDB (`https://api.themoviedb.org/3/search/{movie|tv}`), chave grátis via
  cadastro em themoviedb.org.

Os outros 12 tipos do enum `item_type` continuam manuais — não há API pública equivalente para
podcast, curso, artigo acadêmico, jogo etc. que valha a pena integrar na v1.

## Decisões

- **Chamada direta do cliente, sem Edge Function.** Google Books não exige chave nenhuma. TMDB
  exige uma chave v3, mas ela só dá acesso a dados públicos de filme/série e é rate-limited —
  mesmo julgamento de risco já aplicado a `VITE_GOOGLE_CLIENT_ID` (client ID OAuth, não secreto).
  Segue o padrão `VITE_*` do projeto: chave exposta no cliente é aceitável quando não há segredo
  de verdade a proteger; quando há (Zoom, Google Calendar), a chamada passa por Edge Function.
- **TMDB sem diretor/elenco.** A busca (`/search/movie`, `/search/tv`) não retorna créditos —
  isso exigiria uma segunda chamada a `/credits` por resultado, o que multiplica requisições e
  risco de rate-limit por um ganho que não é essencial pra v1. Filme/série ficam sem `creators`;
  livro continua populando `creators` a partir de `authors` do Google Books.
- **Sem migration nova.** `library_items.{cover_url,description,year,origin_url,subtitle}` e a
  tabela `library_item_creators` já existiam; o trabalho foi 100% de repositório/hooks/UI.
- **Detecção de duplicados continua bloqueante antes de criar** (mesmo `findDuplicateItem` já
  existente) — buscar metadados não pula essa checagem, só preenche os campos do formulário antes
  de submeter.
- **Chave da TMDB entra como prop, não `import.meta.env` direto no módulo.** Módulos deste
  monorepo não têm os tipos do Vite (`ImportMeta.env`) no seu `tsconfig`; o padrão já usado em
  `Seguranca.tsx`/`GoogleCalendarSection` é a página do app ler a env var e passar como prop
  (`tmdbApiKey`) para o componente do módulo.

## Arquivos

- `modules/conhecimento/biblioteca/src/metadataProviders.ts` (novo) — `searchGoogleBooks`,
  `searchTmdb`, tipo `MetadataSearchResult`.
- `repository.ts` — `listItemCreators`, `addItemCreator`.
- `service.ts` — `LIBRARY_ITEM_TYPE_LABELS` (rótulos pt-BR do enum, usados no seletor e na
  Galeria), `SEARCHABLE_ITEM_TYPES` (`["book", "movie", "series"]`).
- `hooks/useLibrary.ts` — `useCreateLibraryItemWithCreators` (cria o item e, se houver resultado
  selecionado, os `creators` junto).
- `components/NewItemForm.tsx` — seletor de tipo, botão "Buscar" (só para tipos buscáveis),
  lista de resultados clicável, prop `tmdbApiKey` opcional.
- `components/GalleryGrid.tsx` — exibe capa e usa `LIBRARY_ITEM_TYPE_LABELS`/ano no lugar do
  enum cru.
- `apps/qqorvex/src/pages/Biblioteca.tsx` — usa `useCreateLibraryItemWithCreators`, passa
  `tmdbApiKey={import.meta.env.VITE_TMDB_API_KEY}`.
- `apps/qqorvex/.env.example` — nova `VITE_TMDB_API_KEY=`.

## Testes

Typecheck limpo (`module-biblioteca`, app) e build de produção limpo. Live-test contra o
Supabase real: insert + select em `library_item_creators` (primeiro uso real dessa tabela) sob o
usuário confirmado, dado de teste removido ao final, sem novos achados nos advisories de
segurança.

## Pendência do usuário

Cadastrar uma chave grátis em themoviedb.org/settings/api e preencher `VITE_TMDB_API_KEY` no
`.env` local. Sem ela, busca de livro (Google Books) funciona normalmente; busca de filme/série
retorna vazio até a chave existir.
