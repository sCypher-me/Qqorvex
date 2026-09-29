-- Keep the wall-clock time selected by each user stable when the scheduled worker
-- creates the next event. Existing Brazilian records keep the app's original locale.
alter table if exists public.recurring_events
  add column if not exists time_zone text not null default 'America/Sao_Paulo';
