-- Reconciliação aditiva do schema remoto.
-- `recurring_tasks` já existia no banco remoto, mas a tabela `tasks` ainda não tinha
-- os vínculos necessários para materializar cada ocorrência no Kanban.

alter table public.tasks
  add column if not exists recurring_task_id uuid references public.recurring_tasks (id) on delete set null,
  add column if not exists recurrence_date date;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'tasks_recurring_occurrence_unique'
       and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_recurring_occurrence_unique
      unique (recurring_task_id, recurrence_date);
  end if;
end $$;

create index if not exists tasks_recurring_task_id_idx
  on public.tasks (recurring_task_id);
