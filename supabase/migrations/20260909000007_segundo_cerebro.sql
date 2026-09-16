-- Segundo Cérebro — fonte de verdade de páginas, blocos, propriedades, bases, links internos,
-- backlinks e tags próprias. v1 lean: sem histórico de versões/checkpoints, sem Lixeira separada
-- (usa is_archived) e sem Views de Base persistidas (layout/filtro/ordenação ficam client-side
-- por enquanto) — todas explicitamente adiáveis pelo Xmind ou de infraestrutura maior.
-- Fórmulas de Base são avaliadas inteiramente em TS (service.ts), nunca em SQL, seguindo o
-- mesmo padrão usado na repetição espaçada de Estudos — "não permitir JavaScript ou execução
-- dinâmica" na fórmula em si, mas o motor que a interpreta é código nosso, determinístico.

create type public.block_type as enum (
  'texto', 'titulo1', 'titulo2', 'titulo3', 'lista', 'checklist', 'citacao', 'callout',
  'codigo', 'tabela', 'imagem', 'arquivo', 'link', 'divisor', 'toggle', 'equacao', 'embed',
  'referencia_pagina', 'referencia_entidade'
);
create type public.page_property_type as enum (
  'texto', 'numero', 'data', 'checkbox', 'select', 'multi_select', 'url', 'relacao', 'favorito'
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  page_type text not null default 'nota',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pages_user_id_idx on public.pages (user_id);
create index pages_user_archived_idx on public.pages (user_id, is_archived);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  block_type public.block_type not null default 'texto',
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blocks_page_id_idx on public.blocks (page_id);

create table public.page_properties (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  key text not null check (char_length(btrim(key)) > 0),
  property_type public.page_property_type not null default 'texto',
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_properties_unique_key unique (page_id, key)
);

create index page_properties_page_id_idx on public.page_properties (page_id);

create table public.page_tags (
  page_id uuid not null references public.pages (id) on delete cascade,
  tag text not null check (char_length(btrim(tag)) > 0),
  created_at timestamptz not null default now(),
  primary key (page_id, tag)
);

-- Links internos estilo wiki. Backlinks de uma página = linhas onde target_page_id = página.
create table public.page_links (
  source_page_id uuid not null references public.pages (id) on delete cascade,
  target_page_id uuid not null references public.pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_page_id, target_page_id),
  constraint page_links_no_self_reference check (source_page_id <> target_page_id)
);

create index page_links_target_page_id_idx on public.page_links (target_page_id);

create table public.bases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bases_user_id_idx on public.bases (user_id);

-- "Cada item de Base continua sendo uma Página completa" — membership, não cópia.
create table public.base_pages (
  base_id uuid not null references public.bases (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (base_id, page_id)
);

create table public.base_formulas (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.bases (id) on delete cascade,
  key text not null check (char_length(btrim(key)) > 0),
  expression text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint base_formulas_unique_key unique (base_id, key)
);

alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.page_properties enable row level security;
alter table public.page_tags enable row level security;
alter table public.page_links enable row level security;
alter table public.bases enable row level security;
alter table public.base_pages enable row level security;
alter table public.base_formulas enable row level security;

create policy "pages_select_own" on public.pages for select using (auth.uid() = user_id);
create policy "pages_insert_own" on public.pages for insert with check (auth.uid() = user_id);
create policy "pages_update_own" on public.pages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pages_delete_own" on public.pages for delete using (auth.uid() = user_id);

create policy "blocks_select_own" on public.blocks for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "blocks_insert_own" on public.blocks for insert
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "blocks_update_own" on public.blocks for update
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "blocks_delete_own" on public.blocks for delete
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "page_properties_select_own" on public.page_properties for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_properties_insert_own" on public.page_properties for insert
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_properties_update_own" on public.page_properties for update
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_properties_delete_own" on public.page_properties for delete
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "page_tags_select_own" on public.page_tags for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_tags_insert_own" on public.page_tags for insert
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_tags_delete_own" on public.page_tags for delete
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

create policy "page_links_select_own" on public.page_links for select
  using (exists (select 1 from public.pages p where p.id = source_page_id and p.user_id = auth.uid()));
create policy "page_links_insert_own" on public.page_links for insert
  with check (
    exists (select 1 from public.pages p where p.id = source_page_id and p.user_id = auth.uid())
    and exists (select 1 from public.pages p2 where p2.id = target_page_id and p2.user_id = auth.uid())
  );
create policy "page_links_delete_own" on public.page_links for delete
  using (exists (select 1 from public.pages p where p.id = source_page_id and p.user_id = auth.uid()));

create policy "bases_select_own" on public.bases for select using (auth.uid() = user_id);
create policy "bases_insert_own" on public.bases for insert with check (auth.uid() = user_id);
create policy "bases_update_own" on public.bases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bases_delete_own" on public.bases for delete using (auth.uid() = user_id);

create policy "base_pages_select_own" on public.base_pages for select
  using (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));
create policy "base_pages_insert_own" on public.base_pages for insert
  with check (
    exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid())
    and exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid())
  );
create policy "base_pages_delete_own" on public.base_pages for delete
  using (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));

create policy "base_formulas_select_own" on public.base_formulas for select
  using (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));
create policy "base_formulas_insert_own" on public.base_formulas for insert
  with check (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));
create policy "base_formulas_update_own" on public.base_formulas for update
  using (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));
create policy "base_formulas_delete_own" on public.base_formulas for delete
  using (exists (select 1 from public.bases b where b.id = base_id and b.user_id = auth.uid()));

create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger blocks_set_updated_at before update on public.blocks for each row execute function public.set_updated_at();
create trigger page_properties_set_updated_at before update on public.page_properties for each row execute function public.set_updated_at();
create trigger bases_set_updated_at before update on public.bases for each row execute function public.set_updated_at();
create trigger base_formulas_set_updated_at before update on public.base_formulas for each row execute function public.set_updated_at();
