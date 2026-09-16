-- Versionamento de documentos. "Definido na implementação"/"evolução futura" no Xmind. `documents`
-- continua representando sempre a versão atual (mesmo padrão do resto do projeto: fonte de
-- verdade nunca duplicada); reenviar um arquivo arquiva o estado anterior em
-- `document_versions` antes de sobrescrever, então nada se perde e é possível restaurar.
alter table public.documents add column current_version integer not null default 1;

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  content_hash text,
  created_at timestamptz not null default now(),
  constraint document_versions_unique_number unique (document_id, version_number)
);

create index document_versions_document_id_idx on public.document_versions (document_id);

alter table public.document_versions enable row level security;

create policy "document_versions_select_own" on public.document_versions for select
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_versions_insert_own" on public.document_versions for insert
  with check (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_versions_delete_own" on public.document_versions for delete
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
