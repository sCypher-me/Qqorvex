-- Produtividade & Tarefas — única fonte de verdade de tarefas do Qqorvex.
-- Regra obrigatória do Kanban: exatamente 3 estados de fluxo (garantido pelo enum abaixo).
-- "Atrasada"/"Bloqueada"/"Cancelada" são condições derivadas, não estados adicionais —
-- não viram valores de task_status; is_cancelled é a única condição persistida porque
-- cancelamento é uma decisão explícita, as demais são calculadas na camada de serviço.

create type public.task_status as enum ('nao_iniciado', 'em_andamento', 'concluido');
create type public.task_priority as enum ('sem_prioridade', 'baixa', 'media', 'alta');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_task_id uuid references public.tasks (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  status public.task_status not null default 'nao_iniciado',
  priority public.task_priority not null default 'sem_prioridade',
  due_date date,
  start_date date,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  tags text[] not null default '{}',
  is_cancelled boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_parent_task_id_idx on public.tasks (parent_task_id);
create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_user_due_date_idx on public.tasks (user_id, due_date);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_checklist_items_task_id_idx on public.task_checklist_items (task_id);

create table public.task_dependencies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_no_self_reference check (task_id <> depends_on_task_id)
);

-- Row Level Security: isolamento total por usuário.

alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_dependencies enable row level security;

create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

create policy "task_checklist_items_select_own" on public.task_checklist_items for select
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
create policy "task_checklist_items_insert_own" on public.task_checklist_items for insert
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
create policy "task_checklist_items_update_own" on public.task_checklist_items for update
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
create policy "task_checklist_items_delete_own" on public.task_checklist_items for delete
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));

create policy "task_dependencies_select_own" on public.task_dependencies for select
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));
create policy "task_dependencies_insert_own" on public.task_dependencies for insert
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tasks t2 where t2.id = depends_on_task_id and t2.user_id = auth.uid()));
create policy "task_dependencies_delete_own" on public.task_dependencies for delete
  using (exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()));

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
