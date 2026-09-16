-- Rotinas agrupam hábitos para check-off em conjunto (ex.: "Manhã" = Meditar + Ler + Exercício).
-- "Recurso opcional" no Xmind, implementado sobre o schema de Hábitos já existente sem duplicar
-- nada: Rotina só referencia hábitos via junção N:N, nunca copia estado/config do hábito. v1
-- lean: sem horário/notificação própria da rotina nem reordenação persistida (a ordem exibida é
-- a de criação da relação).

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create index routines_user_id_idx on public.routines (user_id);

create table public.routine_habits (
  routine_id uuid not null references public.routines (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (routine_id, habit_id)
);

alter table public.routines enable row level security;
alter table public.routine_habits enable row level security;

create policy "routines_select_own" on public.routines for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines for delete using (auth.uid() = user_id);

create policy "routine_habits_select_own" on public.routine_habits for select
  using (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));
create policy "routine_habits_insert_own" on public.routine_habits for insert
  with check (
    exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );
create policy "routine_habits_delete_own" on public.routine_habits for delete
  using (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));
