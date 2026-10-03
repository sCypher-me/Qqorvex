
create table public.gamification_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  tasks_completed integer not null default 0,
  habit_or_goal_checkins integer not null default 0,
  quizzes_completed integer not null default 0,
  library_items_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.gamification_stats enable row level security;

create policy "select own gamification stats" on public.gamification_stats
  for select using (auth.uid() = user_id);
create policy "insert own gamification stats" on public.gamification_stats
  for insert with check (auth.uid() = user_id);
create policy "update own gamification stats" on public.gamification_stats
  for update using (auth.uid() = user_id);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

alter table public.user_badges enable row level security;

create policy "select own badges" on public.user_badges
  for select using (auth.uid() = user_id);
create policy "insert own badges" on public.user_badges
  for insert with check (auth.uid() = user_id);
