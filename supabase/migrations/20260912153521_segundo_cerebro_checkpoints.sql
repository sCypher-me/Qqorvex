-- Segundo Cérebro — Histórico de Versões/Checkpoints (docs/decisions/segundo-cerebro-checkpoints-design.md).
-- Checkpoint manual (não automático a cada edição): título + snapshot de todos os blocos.
create table public.page_checkpoints (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  title text not null,
  blocks_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index page_checkpoints_page_id_idx on public.page_checkpoints (page_id);

alter table public.page_checkpoints enable row level security;

create policy "page_checkpoints_select_own" on public.page_checkpoints for select
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_checkpoints_insert_own" on public.page_checkpoints for insert
  with check (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "page_checkpoints_delete_own" on public.page_checkpoints for delete
  using (exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
