-- Vida Pessoal — Bloco 1: Planejamento (Planos, Projetos, Ideias). Escopo recriado com o usuário
-- em 11/09/2026 (o Xmind original dessa parte foi perdido) — ver docs/decisions/vida-pessoal-design.md.
-- Plano é uma visão ampla e narrativa (ex.: "Ser um designer"); Meta continua o item específico e
-- mensurável de sempre. Um Plano agrupa várias Metas já existentes via `plan_goals`, sem duplicar
-- dado. Projeto é só um agrupador de Tarefas já existentes via `project_tasks` — nunca duplica o
-- Kanban.

create type public.plan_type as enum ('mensal', 'anual', 'quinquenal');
create type public.plan_status as enum ('ativo', 'concluido', 'arquivado');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  plan_type public.plan_type not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  status public.plan_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plans_user_id_idx on public.plans (user_id);

create table public.plan_goals (
  plan_id uuid not null references public.plans (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, goal_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  status public.plan_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

create table public.project_tasks (
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, task_id)
);

-- "Caixa de captura simples" — sem status/categoria de propósito (decisão explícita do usuário).
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ideas_user_id_idx on public.ideas (user_id);

alter table public.plans enable row level security;
alter table public.plan_goals enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.ideas enable row level security;

create policy "plans_select_own" on public.plans for select using (auth.uid() = user_id);
create policy "plans_insert_own" on public.plans for insert with check (auth.uid() = user_id);
create policy "plans_update_own" on public.plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plans_delete_own" on public.plans for delete using (auth.uid() = user_id);

create policy "plan_goals_select_own" on public.plan_goals for select
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "plan_goals_insert_own" on public.plan_goals for insert
  with check (
    exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );
create policy "plan_goals_delete_own" on public.plan_goals for delete
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()));

create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

create policy "project_tasks_select_own" on public.project_tasks for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "project_tasks_insert_own" on public.project_tasks for insert
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
create policy "project_tasks_delete_own" on public.project_tasks for delete
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

create policy "ideas_select_own" on public.ideas for select using (auth.uid() = user_id);
create policy "ideas_insert_own" on public.ideas for insert with check (auth.uid() = user_id);
create policy "ideas_update_own" on public.ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ideas_delete_own" on public.ideas for delete using (auth.uid() = user_id);

create trigger plans_set_updated_at before update on public.plans for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger ideas_set_updated_at before update on public.ideas for each row execute function public.set_updated_at();
