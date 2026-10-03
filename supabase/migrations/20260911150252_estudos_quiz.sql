-- Estudos — Quiz/Testes gerados pela Vex (docs/decisions/estudos-quiz-design.md). Quiz é uma
-- entidade nova, diferente de `assessments` (só um registro manual de prova externa, sem conteúdo
-- gerado). Conteúdo-fonte: Resumos do Caderno; formato: múltipla escolha, 4 alternativas, 5
-- perguntas fixas por quiz; retentativas guardam histórico em quiz_attempts.
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  created_at timestamptz not null default now()
);

create index quizzes_notebook_id_idx on public.quizzes (notebook_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null check (char_length(btrim(question_text)) > 0),
  options jsonb not null,
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  order_index integer not null default 0
);

create index quiz_questions_quiz_id_idx on public.quiz_questions (quiz_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  score integer not null check (score >= 0),
  completed_at timestamptz not null default now()
);

create index quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id);
create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id);

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "quizzes_select_own" on public.quizzes for select
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "quizzes_insert_own" on public.quizzes for insert
  with check (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));
create policy "quizzes_delete_own" on public.quizzes for delete
  using (exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = auth.uid()));

create policy "quiz_questions_select_own" on public.quiz_questions for select
  using (exists (
    select 1 from public.quizzes q join public.notebooks n on n.id = q.notebook_id
    where q.id = quiz_id and n.user_id = auth.uid()
  ));
create policy "quiz_questions_insert_own" on public.quiz_questions for insert
  with check (exists (
    select 1 from public.quizzes q join public.notebooks n on n.id = q.notebook_id
    where q.id = quiz_id and n.user_id = auth.uid()
  ));

create policy "quiz_attempts_select_own" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "quiz_attempts_insert_own" on public.quiz_attempts for insert with check (auth.uid() = user_id);
