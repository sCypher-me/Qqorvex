create table public.notebook_library_items (
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  library_item_id uuid not null references public.library_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (notebook_id, library_item_id)
);

alter table public.notebook_library_items enable row level security;

create policy "notebook_library_items_select_own" on public.notebook_library_items for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "notebook_library_items_insert_own" on public.notebook_library_items for insert
  with check (
    exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid())
    and exists (select 1 from public.library_items i where i.id = library_item_id and i.user_id = auth.uid())
  );
create policy "notebook_library_items_delete_own" on public.notebook_library_items for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

alter table public.events add column assessment_id uuid references public.assessments (id) on delete set null;
create index events_assessment_id_idx on public.events (assessment_id);
