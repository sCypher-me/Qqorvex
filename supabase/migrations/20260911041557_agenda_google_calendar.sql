-- Agenda — Fase 2 das integrações (Google Calendar). Escopo definido com o usuário em 11/09/2026
-- via brainstorming — ver docs/decisions/integracoes-agenda-design.md. Sincronização bidirecional
-- completa por polling (pg_cron), "quem editou por último vence" em conflito.

-- Relação 1:1 evento↔evento do Google — sem tabela de mapeamento separada, mesmo espírito de
-- `task_id`/`document_id` já usados em outras tabelas.
alter table public.events add column google_event_id text;
alter table public.events add column google_updated_at timestamptz;

create table public.google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  google_calendar_id text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Exclusão pendente de sincronizar": deleteEvent() insere aqui antes de apagar a linha do
-- evento (só quando já tinha google_event_id) — não muda o comportamento de exclusão da Agenda
-- que já existe, só permite que a sincronização saiba o que apagar no Google depois que a linha
-- já não existe mais.
create table public.pending_google_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_event_id text not null,
  created_at timestamptz not null default now()
);

create index pending_google_deletions_user_id_idx on public.pending_google_deletions (user_id);

alter table public.google_calendar_connections enable row level security;
alter table public.pending_google_deletions enable row level security;

create policy "google_calendar_connections_select_own" on public.google_calendar_connections for select using (auth.uid() = user_id);
create policy "google_calendar_connections_delete_own" on public.google_calendar_connections for delete using (auth.uid() = user_id);
-- Sem policy de insert/update pra usuários: só a Edge Function (service_role) escreve aqui, já
-- que a troca do código OAuth pelo refresh_token acontece fora de uma sessão de usuário normal
-- (é o Google chamando o callback, não o cliente autenticado).

create policy "pending_google_deletions_select_own" on public.pending_google_deletions for select using (auth.uid() = user_id);
create policy "pending_google_deletions_insert_own" on public.pending_google_deletions for insert with check (auth.uid() = user_id);
-- Delete só via service_role (a própria sincronização remove depois de processar).

create trigger google_calendar_connections_set_updated_at before update on public.google_calendar_connections for each row execute function public.set_updated_at();
