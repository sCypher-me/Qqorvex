-- Eventos recorrentes: identifica cada ocorrência para que a Agenda e o cron possam
-- disputar a geração com segurança sem criar duplicatas.

alter table public.events
  add column if not exists recurring_event_id uuid references public.recurring_events (id) on delete set null,
  add column if not exists recurrence_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_recurring_occurrence_unique'
  ) then
    alter table public.events
      add constraint events_recurring_occurrence_unique
      unique (recurring_event_id, recurrence_date);
  end if;
end
$$;

create index if not exists events_recurring_event_id_idx
  on public.events (recurring_event_id);

