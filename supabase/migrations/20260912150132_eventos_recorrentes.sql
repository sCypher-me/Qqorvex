-- Eventos recorrentes (docs/decisions/eventos-recorrentes-design.md). Reaproveita
-- task_recurrence_frequency e recurring_status (já existem, mesmos valores) em vez de duplicar
-- enums. start_time/end_time guardam só a hora do dia; a data de cada ocorrência vem de
-- next_occurrence_date.
create table public.recurring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  location text,
  meeting_link text,
  category text not null default 'compromisso',
  is_all_day boolean not null default false,
  start_time time,
  end_time time,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  frequency public.task_recurrence_frequency not null,
  start_date date not null,
  next_occurrence_date date not null,
  status public.recurring_status not null default 'ativa',
  created_at timestamptz not null default now()
);

create index recurring_events_user_id_idx on public.recurring_events (user_id);

alter table public.recurring_events enable row level security;

create policy "recurring_events_select_own" on public.recurring_events for select using (auth.uid() = user_id);
create policy "recurring_events_insert_own" on public.recurring_events for insert with check (auth.uid() = user_id);
create policy "recurring_events_update_own" on public.recurring_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_events_delete_own" on public.recurring_events for delete using (auth.uid() = user_id);
