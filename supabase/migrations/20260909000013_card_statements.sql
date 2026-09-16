-- Fatura/fechamento de cartão. "Definido posteriormente" no Xmind (v1 lean adiou conscientemente),
-- implementado agora sobre `cards`/`transactions` já existentes: um cartão passa a ter dia de
-- fechamento/vencimento, e uma fatura é um período fechado (competência) com status próprio —
-- o total da fatura é sempre calculado a partir das transações do cartão no período (nunca
-- copiado), seguindo o mesmo padrão de "cálculo em TS, nunca duplicar dado" do restante de
-- Finanças. Limite de dia 1–28 evita casos de borda de mês curto (fevereiro).
alter table public.cards add column closing_day smallint check (closing_day is null or closing_day between 1 and 28);
alter table public.cards add column due_day smallint check (due_day is null or due_day between 1 and 28);

create type public.card_statement_status as enum ('aberta', 'fechada', 'paga');

create table public.card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  reference_month text not null check (reference_month ~ '^\d{4}-\d{2}$'),
  closing_date date not null,
  due_date date not null,
  status public.card_statement_status not null default 'aberta',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint card_statements_unique_card_period unique (card_id, reference_month)
);

create index card_statements_card_id_idx on public.card_statements (card_id);

alter table public.card_statements enable row level security;

create policy "card_statements_select_own" on public.card_statements for select using (auth.uid() = user_id);
create policy "card_statements_insert_own" on public.card_statements for insert with check (auth.uid() = user_id);
create policy "card_statements_update_own" on public.card_statements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "card_statements_delete_own" on public.card_statements for delete using (auth.uid() = user_id);
