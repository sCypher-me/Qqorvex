-- Tarefas recorrentes: cada ocorrência vira uma tarefa comum identificável.
-- A chave (recorrência, data) permite sincronização segura entre o Kanban e o cron.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'task_recurrence_frequency'
  ) then
    execute 'create type public.task_recurrence_frequency as enum (''diaria'', ''semanal'', ''mensal'')';
  end if;
end $$;

create table if not exists public.recurring_tasks (
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

create index if not exists recurring_tasks_user_next_occurrence_idx
  on public.recurring_tasks (user_id, status, next_occurrence_date);

alter table public.recurring_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_select_own'
  ) then
    create policy "recurring_tasks_select_own" on public.recurring_tasks
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_insert_own'
  ) then
    create policy "recurring_tasks_insert_own" on public.recurring_tasks
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_update_own'
  ) then
    create policy "recurring_tasks_update_own" on public.recurring_tasks
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

alter table public.tasks
  add column if not exists recurring_task_id uuid references public.recurring_tasks (id) on delete set null,
  add column if not exists recurrence_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_recurring_occurrence_unique'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_recurring_occurrence_unique unique (recurring_task_id, recurrence_date);
  end if;
end $$;

create index if not exists tasks_recurring_task_id_idx on public.tasks (recurring_task_id);
