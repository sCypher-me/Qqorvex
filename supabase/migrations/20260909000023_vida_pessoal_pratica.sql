-- Vida Pessoal — Bloco 3: Vida Prática (Contatos Úteis, Veículos, Bens e Inventário, Compras
-- Importantes, Lista de Compras). Escopo recriado com o usuário em 11/09/2026 — ver
-- docs/decisions/vida-pessoal-design.md. `useful_contacts` NÃO é uma agenda de contatos genérica
-- (decisão explícita do usuário — isso já é papel do celular), só profissionais/serviços úteis.
-- Documentos de veículo (CRLV, seguro) usam `document_relations` já existente
-- (`related_module = 'vida-pessoal'`), sem tabela nova pra isso.

create table public.useful_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  category text,
  phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index useful_contacts_user_id_idx on public.useful_contacts (user_id);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) > 0),
  plate text,
  brand text,
  model text,
  year smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_user_id_idx on public.vehicles (user_id);

create table public.vehicle_important_dates (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  label text not null check (char_length(btrim(label)) > 0),
  date date not null,
  created_at timestamptz not null default now()
);

create index vehicle_important_dates_vehicle_id_idx on public.vehicle_important_dates (vehicle_id);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  category text,
  estimated_value numeric,
  location text,
  warranty_id uuid references public.warranties (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_user_id_idx on public.assets (user_id);

create type public.purchase_priority as enum ('baixa', 'media', 'alta');

create table public.important_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  estimated_price numeric,
  priority public.purchase_priority not null default 'media',
  is_purchased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index important_purchases_user_id_idx on public.important_purchases (user_id);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  quantity text,
  is_purchased boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_list_items_user_id_idx on public.shopping_list_items (user_id);

alter table public.useful_contacts enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_important_dates enable row level security;
alter table public.assets enable row level security;
alter table public.important_purchases enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "useful_contacts_select_own" on public.useful_contacts for select using (auth.uid() = user_id);
create policy "useful_contacts_insert_own" on public.useful_contacts for insert with check (auth.uid() = user_id);
create policy "useful_contacts_update_own" on public.useful_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "useful_contacts_delete_own" on public.useful_contacts for delete using (auth.uid() = user_id);

create policy "vehicles_select_own" on public.vehicles for select using (auth.uid() = user_id);
create policy "vehicles_insert_own" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "vehicles_update_own" on public.vehicles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vehicles_delete_own" on public.vehicles for delete using (auth.uid() = user_id);

create policy "vehicle_important_dates_select_own" on public.vehicle_important_dates for select
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()));
create policy "vehicle_important_dates_insert_own" on public.vehicle_important_dates for insert
  with check (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()));
create policy "vehicle_important_dates_delete_own" on public.vehicle_important_dates for delete
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()));

create policy "assets_select_own" on public.assets for select using (auth.uid() = user_id);
create policy "assets_insert_own" on public.assets for insert with check (auth.uid() = user_id);
create policy "assets_update_own" on public.assets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assets_delete_own" on public.assets for delete using (auth.uid() = user_id);

create policy "important_purchases_select_own" on public.important_purchases for select using (auth.uid() = user_id);
create policy "important_purchases_insert_own" on public.important_purchases for insert with check (auth.uid() = user_id);
create policy "important_purchases_update_own" on public.important_purchases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "important_purchases_delete_own" on public.important_purchases for delete using (auth.uid() = user_id);

create policy "shopping_list_items_select_own" on public.shopping_list_items for select using (auth.uid() = user_id);
create policy "shopping_list_items_insert_own" on public.shopping_list_items for insert with check (auth.uid() = user_id);
create policy "shopping_list_items_update_own" on public.shopping_list_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_list_items_delete_own" on public.shopping_list_items for delete using (auth.uid() = user_id);

create trigger useful_contacts_set_updated_at before update on public.useful_contacts for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger important_purchases_set_updated_at before update on public.important_purchases for each row execute function public.set_updated_at();
