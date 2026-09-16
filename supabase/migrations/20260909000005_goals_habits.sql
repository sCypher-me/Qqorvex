-- Metas & Hábitos — única fonte de verdade de metas, marcos, check-ins, hábitos e registros
-- de hábito. v1 lean: sem Rotinas, Revisão Semanal, Insights e Notificações (todos "recursos
-- opcionais" segundo o próprio Xmind) — ficam para uma iteração futura sobre estas mesmas tabelas.
-- Regra: progresso "derivado" nunca inventa valor; sem módulo de origem (ex.: Finanças) ainda
-- implementado, permanece indisponível em vez de simulado.

create type public.goal_status as enum ('planejada', 'ativa', 'pausada', 'concluida', 'cancelada');
create type public.goal_progress_type as enum ('binario', 'percentual_manual', 'marcos', 'numerico', 'derivado');
create type public.habit_frequency_type as enum ('diaria', 'dias_especificos', 'x_vezes_semana', 'semanal', 'mensal', 'personalizada');
create type public.habit_status as enum ('ativo', 'pausado', 'arquivado');
create type public.habit_log_state as enum ('concluido', 'parcial', 'pulado');

-- Hierarquia de metas: suporta no máximo Meta principal + Submetas de primeiro nível.
-- Profundidade é validada na camada de serviço (TS), não aqui, seguindo o mesmo padrão usado
-- para ciclos de dependência de tarefas.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_goal_id uuid references public.goals (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  due_date date,
  category text,
  motivation_note text,
  tags text[] not null default '{}',
  status public.goal_status not null default 'planejada',
  progress_type public.goal_progress_type not null default 'binario',
  progress_percent numeric(5, 2) check (progress_percent is null or (progress_percent >= 0 and progress_percent <= 100)),
  progress_numeric_current numeric,
  progress_numeric_target numeric,
  progress_source_module text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);
create index goals_parent_goal_id_idx on public.goals (parent_goal_id);
create index goals_user_status_idx on public.goals (user_id, status);

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  order_index integer not null default 0,
  is_done boolean not null default false,
  target_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goal_milestones_goal_id_idx on public.goal_milestones (goal_id);

create table public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  checkin_date date not null default current_date,
  progress_percent_snapshot numeric(5, 2),
  note text,
  created_at timestamptz not null default now()
);

create index goal_checkins_goal_id_idx on public.goal_checkins (goal_id);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  frequency_type public.habit_frequency_type not null default 'diaria',
  -- ex.: {"days":["mon","wed","fri"]} ou {"timesPerWeek":3} — mantém frequências flexíveis
  -- sem exigir uma coluna nova por tipo de frequência.
  frequency_config jsonb not null default '{}'::jsonb,
  preferred_time time,
  category text,
  tags text[] not null default '{}',
  status public.habit_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);
create index habits_user_status_idx on public.habits (user_id, status);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  state public.habit_log_state not null,
  quantity numeric,
  note text,
  created_at timestamptz not null default now(),
  constraint habit_logs_unique_per_day unique (habit_id, log_date)
);

create index habit_logs_habit_id_idx on public.habit_logs (habit_id);

-- "Uma meta pode relacionar vários hábitos; um hábito pode contribuir para uma ou mais metas."
create table public.goal_habit_relations (
  goal_id uuid not null references public.goals (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, habit_id)
);

alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.goal_checkins enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goal_habit_relations enable row level security;

create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

create policy "goal_milestones_select_own" on public.goal_milestones for select
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_milestones_insert_own" on public.goal_milestones for insert
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_milestones_update_own" on public.goal_milestones for update
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_milestones_delete_own" on public.goal_milestones for delete
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));

create policy "goal_checkins_select_own" on public.goal_checkins for select
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_checkins_insert_own" on public.goal_checkins for insert
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_checkins_delete_own" on public.goal_checkins for delete
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));

create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

create policy "habit_logs_select_own" on public.habit_logs for select
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "habit_logs_insert_own" on public.habit_logs for insert
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "habit_logs_update_own" on public.habit_logs for update
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "habit_logs_delete_own" on public.habit_logs for delete
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

create policy "goal_habit_relations_select_own" on public.goal_habit_relations for select
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_habit_relations_insert_own" on public.goal_habit_relations for insert
  with check (
    exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );
create policy "goal_habit_relations_delete_own" on public.goal_habit_relations for delete
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger goal_milestones_set_updated_at
  before update on public.goal_milestones
  for each row execute function public.set_updated_at();

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();
