-- Tarefas recorrentes (docs/decisions/tarefas-recorrentes-design.md). recurring_status
-- (ativa/pausada/cancelada) já existe (criado por Finanças) — reaproveitado sem recriar.
create type public.task_recurrence_frequency as enum ('diaria', 'semanal', 'mensal');

create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  priority public.task_priority not null default 'sem_prioridade',
  frequency public.task_recurrence_frequency not null,
  start_date date not null,
  next_occurrence_date date not null,
  status public.recurring_status not null default 'ativa',
  created_at timestamptz not null default now()
);

create index recurring_tasks_user_id_idx on public.recurring_tasks (user_id);

alter table public.recurring_tasks enable row level security;

create policy "recurring_tasks_select_own" on public.recurring_tasks for select using (auth.uid() = user_id);
create policy "recurring_tasks_insert_own" on public.recurring_tasks for insert with check (auth.uid() = user_id);
create policy "recurring_tasks_update_own" on public.recurring_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_tasks_delete_own" on public.recurring_tasks for delete using (auth.uid() = user_id);
