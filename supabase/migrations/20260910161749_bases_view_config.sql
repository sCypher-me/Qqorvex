alter table public.bases add column view_config jsonb not null default '{}'::jsonb;
