-- Vida Pessoal — Bloco 2: Bem-estar (check-in diário, Pomodoro). Escopo recriado com o usuário
-- em 11/09/2026 — ver docs/decisions/vida-pessoal-design.md. "Autocuidado" e "Bem-estar" viraram
-- uma coisa só: um check-in diário (não são hábitos repetíveis, são um registro por dia).
-- Pomodoro segue a mecânica do app Forest: sair/cancelar antes do tempo acabar marca a sessão
-- como `died` (a árvore "morre"), não conta nas estatísticas.

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null,
  mood smallint not null check (mood between 1 and 5),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index daily_checkins_user_id_idx on public.daily_checkins (user_id);

create type public.pomodoro_status as enum ('completed', 'died');

create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration_minutes smallint not null check (duration_minutes > 0),
  status public.pomodoro_status not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);

alter table public.daily_checkins enable row level security;
alter table public.pomodoro_sessions enable row level security;

create policy "daily_checkins_select_own" on public.daily_checkins for select using (auth.uid() = user_id);
create policy "daily_checkins_insert_own" on public.daily_checkins for insert with check (auth.uid() = user_id);
create policy "daily_checkins_update_own" on public.daily_checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_checkins_delete_own" on public.daily_checkins for delete using (auth.uid() = user_id);

create policy "pomodoro_sessions_select_own" on public.pomodoro_sessions for select using (auth.uid() = user_id);
create policy "pomodoro_sessions_insert_own" on public.pomodoro_sessions for insert with check (auth.uid() = user_id);
create policy "pomodoro_sessions_delete_own" on public.pomodoro_sessions for delete using (auth.uid() = user_id);
