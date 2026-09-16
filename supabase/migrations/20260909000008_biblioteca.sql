-- Biblioteca & Conteúdo — fonte de verdade de itens, status/progresso de consumo, avaliações,
-- ciclos, coleções, histórico e relações internas entre conteúdos. v1 lean: sem conteúdo
-- episódico estruturado (temporadas/episódios), sem detecção de duplicados/mesclagem, sem
-- Metadata Provider Layer (importação por URL) e sem Insights/Retrospectiva — todos explicitamente
-- "evolução futura" ou dependentes de infraestrutura externa (APIs de metadados) que ainda não
-- existe. "A única visualização do acervo é Galeria" é responsabilidade da UI, não do schema.

create type public.library_item_type as enum (
  'book', 'comic', 'manga', 'movie', 'series', 'anime', 'podcast', 'podcast_episode',
  'video', 'article', 'web_content', 'course', 'academic_paper', 'game', 'other'
);
create type public.library_item_status as enum (
  'quero_consumir', 'em_andamento', 'concluido', 'pausado', 'abandonado'
);
create type public.library_relation_type as enum (
  'adaptacao', 'continuacao', 'prequela', 'mesma_franquia', 'baseado_em', 'relacionado'
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  subtitle text,
  item_type public.library_item_type not null default 'other',
  description text,
  cover_url text,
  status public.library_item_status not null default 'quero_consumir',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  short_note text,
  tags text[] not null default '{}',
  origin_url text,
  language text,
  year integer,
  progress_mode text check (progress_mode is null or progress_mode in ('numerico', 'percentual')),
  progress_current numeric,
  progress_total numeric,
  progress_unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index library_items_user_id_idx on public.library_items (user_id);
create index library_items_user_status_idx on public.library_items (user_id, status);
create index library_items_user_type_idx on public.library_items (user_id, item_type);

create table public.library_item_creators (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  role text not null default 'Autor',
  order_index integer not null default 0
);

create index library_item_creators_item_id_idx on public.library_item_creators (item_id);

-- "Um mesmo item pode ter vários ciclos para releitura, reassistida ou replay sem duplicar o
-- item." ended_at/end_state nulos = ciclo em andamento.
create table public.library_consumption_cycles (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_state text check (end_state is null or end_state in ('concluido', 'abandonado')),
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  note text,
  created_at timestamptz not null default now()
);

create index library_consumption_cycles_item_id_idx on public.library_consumption_cycles (item_id);

create table public.library_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index library_collections_user_id_idx on public.library_collections (user_id);

create table public.library_collection_items (
  collection_id uuid not null references public.library_collections (id) on delete cascade,
  item_id uuid not null references public.library_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);

create table public.library_item_relations (
  source_item_id uuid not null references public.library_items (id) on delete cascade,
  target_item_id uuid not null references public.library_items (id) on delete cascade,
  relation_type public.library_relation_type not null default 'relacionado',
  created_at timestamptz not null default now(),
  primary key (source_item_id, target_item_id),
  constraint library_item_relations_no_self_reference check (source_item_id <> target_item_id)
);

alter table public.library_items enable row level security;
alter table public.library_item_creators enable row level security;
alter table public.library_consumption_cycles enable row level security;
alter table public.library_collections enable row level security;
alter table public.library_collection_items enable row level security;
alter table public.library_item_relations enable row level security;

create policy "library_items_select_own" on public.library_items for select using (auth.uid() = user_id);
create policy "library_items_insert_own" on public.library_items for insert with check (auth.uid() = user_id);
create policy "library_items_update_own" on public.library_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "library_items_delete_own" on public.library_items for delete using (auth.uid() = user_id);

create policy "library_item_creators_select_own" on public.library_item_creators for select
  using (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));
create policy "library_item_creators_insert_own" on public.library_item_creators for insert
  with check (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));
create policy "library_item_creators_delete_own" on public.library_item_creators for delete
  using (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));

create policy "library_consumption_cycles_select_own" on public.library_consumption_cycles for select
  using (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));
create policy "library_consumption_cycles_insert_own" on public.library_consumption_cycles for insert
  with check (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));
create policy "library_consumption_cycles_update_own" on public.library_consumption_cycles for update
  using (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));
create policy "library_consumption_cycles_delete_own" on public.library_consumption_cycles for delete
  using (exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid()));

create policy "library_collections_select_own" on public.library_collections for select using (auth.uid() = user_id);
create policy "library_collections_insert_own" on public.library_collections for insert with check (auth.uid() = user_id);
create policy "library_collections_update_own" on public.library_collections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "library_collections_delete_own" on public.library_collections for delete using (auth.uid() = user_id);

create policy "library_collection_items_select_own" on public.library_collection_items for select
  using (exists (select 1 from public.library_collections c where c.id = collection_id and c.user_id = auth.uid()));
create policy "library_collection_items_insert_own" on public.library_collection_items for insert
  with check (
    exists (select 1 from public.library_collections c where c.id = collection_id and c.user_id = auth.uid())
    and exists (select 1 from public.library_items i where i.id = item_id and i.user_id = auth.uid())
  );
create policy "library_collection_items_delete_own" on public.library_collection_items for delete
  using (exists (select 1 from public.library_collections c where c.id = collection_id and c.user_id = auth.uid()));

create policy "library_item_relations_select_own" on public.library_item_relations for select
  using (exists (select 1 from public.library_items i where i.id = source_item_id and i.user_id = auth.uid()));
create policy "library_item_relations_insert_own" on public.library_item_relations for insert
  with check (
    exists (select 1 from public.library_items i where i.id = source_item_id and i.user_id = auth.uid())
    and exists (select 1 from public.library_items i2 where i2.id = target_item_id and i2.user_id = auth.uid())
  );
create policy "library_item_relations_delete_own" on public.library_item_relations for delete
  using (exists (select 1 from public.library_items i where i.id = source_item_id and i.user_id = auth.uid()));

create trigger library_items_set_updated_at before update on public.library_items for each row execute function public.set_updated_at();
create trigger library_collections_set_updated_at before update on public.library_collections for each row execute function public.set_updated_at();
