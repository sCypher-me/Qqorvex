-- Agenda & Tempo — única fonte de verdade dos blocos de horário do Qqorvex.
-- v1 lean: eventos locais Qqorvex (sem integrações Google/Zoom, sem recorrência e sem
-- scheduler de notificações — todos explicitamente adiáveis pelo próprio Xmind e dependentes
-- de credenciais/infra externas que ainda não existem no projeto).
-- task_id referencia Tarefas por relação (não cópia): "uma tarefa pode ter zero, um ou vários
-- blocos de Agenda"; alterar o bloco nunca deve alterar prazo/estado da tarefa.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  location text,
  meeting_link text,
  category text not null default 'compromisso',
  is_all_day boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz not null,
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at >= start_at)
);

create index events_user_id_idx on public.events (user_id);
create index events_user_start_at_idx on public.events (user_id, start_at);
create index events_task_id_idx on public.events (task_id);

create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  minutes_before integer not null check (minutes_before >= 0),
  created_at timestamptz not null default now()
);

create index event_reminders_event_id_idx on public.event_reminders (event_id);

alter table public.events enable row level security;
alter table public.event_reminders enable row level security;

create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);

create policy "event_reminders_select_own" on public.event_reminders for select
  using (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));
create policy "event_reminders_insert_own" on public.event_reminders for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));
create policy "event_reminders_update_own" on public.event_reminders for update
  using (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));
create policy "event_reminders_delete_own" on public.event_reminders for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid()));

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
