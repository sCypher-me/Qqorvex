-- Documentos & Arquivos — fonte de verdade do arquivo e de seus metadados; outros módulos
-- guardam apenas referência/relação (document_relations é o lado genérico dessa relação).
-- v1 lean: sem OCR/extração, sem versionamento, sem detecção de duplicados e sem Lixeira própria
-- (usa is_archived, igual aos outros módulos) — todos "definidos na implementação"/"evolução
-- futura" no Xmind. Cofre (`is_vault`) é só um marcador nesta fase: isolamento por usuário via
-- RLS já se aplica a todo documento, mas a camada extra de reautenticação/criptografia do Cofre
-- é responsabilidade da futura Central de Segurança, não deste schema.

create type public.document_type as enum (
  'nota_fiscal', 'recibo', 'contrato', 'garantia', 'comprovante', 'certificado',
  'documento_pessoal', 'fatura', 'manual', 'outro'
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create index folders_user_id_idx on public.folders (user_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  storage_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) > 0),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  document_type public.document_type not null default 'outro',
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  is_important boolean not null default false,
  is_vault boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on public.documents (user_id);
create index documents_user_type_idx on public.documents (user_id, document_type);
create index documents_folder_id_idx on public.documents (folder_id);

-- "Um mesmo documento pode se relacionar a entidades diferentes sem duplicar o arquivo."
-- related_module identifica o domínio (ex.: 'financas', 'estudos', 'vida-pessoal'); a FK real
-- para a entidade específica não existe aqui de propósito — cada módulo relacionado é quem
-- resolve related_entity_id através da própria API pública.
create table public.document_relations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  related_module text not null,
  related_entity_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

create index document_relations_document_id_idx on public.document_relations (document_id);
create index document_relations_entity_idx on public.document_relations (related_module, related_entity_id);

create table public.document_important_dates (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  label text not null check (char_length(btrim(label)) > 0),
  date date not null,
  created_at timestamptz not null default now()
);

create index document_important_dates_document_id_idx on public.document_important_dates (document_id);

-- "O sistema pode calcular a data final a partir da data da compra + duração informada."
-- end_date é calculado em service.ts (TS) no momento da criação/edição e persistido para poder
-- ser consultado/filtrado sem recalcular; a lógica em si vive fora do banco, como nos demais
-- módulos (repetição espaçada, fórmulas de Base).
create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  product_name text not null check (char_length(btrim(product_name)) > 0),
  purchase_date date not null,
  duration_months integer not null check (duration_months > 0),
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index warranties_user_id_idx on public.warranties (user_id);
create index warranties_end_date_idx on public.warranties (user_id, end_date);

alter table public.folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_relations enable row level security;
alter table public.document_important_dates enable row level security;
alter table public.warranties enable row level security;

create policy "folders_select_own" on public.folders for select using (auth.uid() = user_id);
create policy "folders_insert_own" on public.folders for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.folders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "folders_delete_own" on public.folders for delete using (auth.uid() = user_id);

create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);

create policy "document_relations_select_own" on public.document_relations for select
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_relations_insert_own" on public.document_relations for insert
  with check (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_relations_delete_own" on public.document_relations for delete
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));

create policy "document_important_dates_select_own" on public.document_important_dates for select
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_important_dates_insert_own" on public.document_important_dates for insert
  with check (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_important_dates_delete_own" on public.document_important_dates for delete
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));

create policy "warranties_select_own" on public.warranties for select using (auth.uid() = user_id);
create policy "warranties_insert_own" on public.warranties for insert with check (auth.uid() = user_id);
create policy "warranties_update_own" on public.warranties for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "warranties_delete_own" on public.warranties for delete using (auth.uid() = user_id);

create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger warranties_set_updated_at before update on public.warranties for each row execute function public.set_updated_at();

-- Storage: bucket privado, um objeto por documento em `{user_id}/{document_id}/{file_name}`.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_storage_update_own"
  on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
