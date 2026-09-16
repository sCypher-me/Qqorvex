-- Estudos — fonte de verdade dos Cadernos e objetos próprios de aprendizagem.
-- v1 lean: só o Core comum (Tópicos, Resumos, Flashcards+Revisão Espaçada, Erros & Dúvidas,
-- Avaliações, Sessões de Estudo). Quiz/Testes gerados e Study Capability Packs por área ficam
-- para quando a camada Vex existir — dependem de geração de conteúdo, não só de schema.
-- O algoritmo de revisão espaçada vive inteiramente em service.ts (TS), nunca em SQL, para
-- poder ser substituído sem perder conteúdo/histórico, como o Xmind exige.

create type public.notebook_type as enum ('materia', 'curso', 'certificacao', 'preparacao_prova', 'tema_estudo', 'outro');
create type public.notebook_status as enum ('ativo', 'pausado', 'concluido', 'arquivado');
create type public.flashcard_review_grade as enum ('errei', 'dificil', 'bom', 'facil');
create type public.error_doubt_kind as enum ('duvida', 'erro', 'conceito_confundido');

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  notebook_type public.notebook_type not null default 'outro',
  area text,
  tags text[] not null default '{}',
  description text,
  institution text,
  instructor text,
  status public.notebook_status not null default 'ativo',
  is_favorite boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notebooks_user_id_idx on public.notebooks (user_id);
create index notebooks_user_status_idx on public.notebooks (user_id, status);

-- Hierarquia de tópicos: profundidade máxima validada em service.ts, seguindo o mesmo padrão
-- usado em Metas (principal + submeta) — "manter hierarquia simples/limitada".
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  parent_topic_id uuid references public.topics (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index topics_notebook_id_idx on public.topics (notebook_id);
create index topics_parent_topic_id_idx on public.topics (parent_topic_id);

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  title text not null check (char_length(btrim(title)) > 0),
  content text not null default '',
  origin text not null default 'manual' check (origin in ('manual', 'vex', 'material')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index summaries_notebook_id_idx on public.summaries (notebook_id);
create index summaries_topic_id_idx on public.summaries (topic_id);

-- Campos de revisão espaçada guardam apenas o estado atual (resultado do algoritmo em TS);
-- o histórico de fato vive em flashcard_reviews.
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  summary_id uuid references public.summaries (id) on delete set null,
  front text not null check (char_length(btrim(front)) > 0),
  back text not null check (char_length(btrim(back)) > 0),
  tags text[] not null default '{}',
  next_review_date date not null default current_date,
  interval_days integer not null default 1 check (interval_days > 0),
  ease_factor numeric(4, 2) not null default 2.5 check (ease_factor >= 1.3),
  repetitions integer not null default 0 check (repetitions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcards_notebook_id_idx on public.flashcards (notebook_id);
create index flashcards_topic_id_idx on public.flashcards (topic_id);
create index flashcards_next_review_date_idx on public.flashcards (notebook_id, next_review_date);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  grade public.flashcard_review_grade not null,
  reviewed_at timestamptz not null default now()
);

create index flashcard_reviews_flashcard_id_idx on public.flashcard_reviews (flashcard_id);

create table public.errors_doubts (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  flashcard_id uuid references public.flashcards (id) on delete set null,
  summary_id uuid references public.summaries (id) on delete set null,
  kind public.error_doubt_kind not null default 'duvida',
  description text not null check (char_length(btrim(description)) > 0),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index errors_doubts_notebook_id_idx on public.errors_doubts (notebook_id);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  assessment_date date,
  expected_content text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_notebook_id_idx on public.assessments (notebook_id);
create index assessments_notebook_date_idx on public.assessments (notebook_id, assessment_date);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  note text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index study_sessions_notebook_id_idx on public.study_sessions (notebook_id);

alter table public.notebooks enable row level security;
alter table public.topics enable row level security;
alter table public.summaries enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.errors_doubts enable row level security;
alter table public.assessments enable row level security;
alter table public.study_sessions enable row level security;

create policy "notebooks_select_own" on public.notebooks for select using (auth.uid() = user_id);
create policy "notebooks_insert_own" on public.notebooks for insert with check (auth.uid() = user_id);
create policy "notebooks_update_own" on public.notebooks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notebooks_delete_own" on public.notebooks for delete using (auth.uid() = user_id);

create policy "topics_select_own" on public.topics for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "topics_insert_own" on public.topics for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "topics_update_own" on public.topics for update
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "topics_delete_own" on public.topics for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "summaries_select_own" on public.summaries for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "summaries_insert_own" on public.summaries for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "summaries_update_own" on public.summaries for update
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "summaries_delete_own" on public.summaries for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "flashcards_select_own" on public.flashcards for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "flashcards_insert_own" on public.flashcards for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "flashcards_update_own" on public.flashcards for update
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "flashcards_delete_own" on public.flashcards for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "flashcard_reviews_select_own" on public.flashcard_reviews for select
  using (exists (
    select 1 from public.flashcards f join public.notebooks n on n.id = f.notebook_id
    where f.id = flashcard_id and n.user_id = auth.uid()
  ));
create policy "flashcard_reviews_insert_own" on public.flashcard_reviews for insert
  with check (exists (
    select 1 from public.flashcards f join public.notebooks n on n.id = f.notebook_id
    where f.id = flashcard_id and n.user_id = auth.uid()
  ));

create policy "errors_doubts_select_own" on public.errors_doubts for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "errors_doubts_insert_own" on public.errors_doubts for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "errors_doubts_update_own" on public.errors_doubts for update
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "errors_doubts_delete_own" on public.errors_doubts for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "assessments_select_own" on public.assessments for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "assessments_insert_own" on public.assessments for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "assessments_update_own" on public.assessments for update
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "assessments_delete_own" on public.assessments for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "study_sessions_select_own" on public.study_sessions for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "study_sessions_insert_own" on public.study_sessions for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "study_sessions_delete_own" on public.study_sessions for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create trigger notebooks_set_updated_at before update on public.notebooks for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger summaries_set_updated_at before update on public.summaries for each row execute function public.set_updated_at();
create trigger flashcards_set_updated_at before update on public.flashcards for each row execute function public.set_updated_at();
create trigger errors_doubts_set_updated_at before update on public.errors_doubts for each row execute function public.set_updated_at();
create trigger assessments_set_updated_at before update on public.assessments for each row execute function public.set_updated_at();
