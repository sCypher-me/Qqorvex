alter table public.documents add column deleted_at timestamptz;

create index documents_deleted_at_idx on public.documents (deleted_at) where deleted_at is not null;
