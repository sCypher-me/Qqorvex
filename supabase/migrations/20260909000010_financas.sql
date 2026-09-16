-- Finanças — fonte de verdade dos dados financeiros; Hoje, Agenda, Vex e outros módulos apenas
-- consomem representações controladas. v1 lean: sem fatura/fechamento de cartão, sem alertas de
-- orçamento automáticos e sem Calendário Financeiro dedicado (a Agenda pode futuramente derivar
-- eventos a partir daqui) — todos "definidos posteriormente" no Xmind. Saldo Atual/Projetado são
-- calculados em service.ts (TS), nunca em SQL, seguindo o mesmo padrão dos demais módulos.

create type public.transaction_type as enum ('entrada', 'saida', 'transferencia');
create type public.transaction_status as enum ('concluida', 'futura', 'pendente', 'vencida', 'cancelada');
create type public.payment_method as enum ('dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia', 'outra');
create type public.recurrence_frequency as enum ('mensal', 'anual', 'bimestral', 'trimestral', 'semestral');
create type public.recurring_status as enum ('ativa', 'pausada', 'cancelada');
create type public.category_kind as enum ('entrada', 'saida');
create type public.account_type as enum ('dinheiro', 'conta_bancaria', 'carteira_digital', 'outro');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  account_type public.account_type not null default 'outro',
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) > 0),
  institution text,
  last_digits text check (last_digits is null or char_length(last_digits) <= 4),
  created_at timestamptz not null default now()
);

create index cards_user_id_idx on public.cards (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  kind public.category_kind not null,
  created_at timestamptz not null default now(),
  constraint categories_unique_name_per_kind unique (user_id, name, kind)
);

create index categories_user_id_idx on public.categories (user_id);

-- Assinatura é uma recorrência de saída com is_subscription=true; mesma tabela, área de UI
-- diferente. "A Assinatura é o modelo recorrente; cada cobrança é uma movimentação vinculada."
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  amount numeric not null check (amount > 0),
  transaction_type public.transaction_type not null default 'saida' check (transaction_type <> 'transferencia'),
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  card_id uuid references public.cards (id) on delete set null,
  payment_method public.payment_method,
  frequency public.recurrence_frequency not null default 'mensal',
  start_date date not null,
  next_occurrence_date date not null,
  end_date date,
  is_subscription boolean not null default false,
  status public.recurring_status not null default 'ativa',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recurring_transactions_user_id_idx on public.recurring_transactions (user_id);
create index recurring_transactions_next_occurrence_idx on public.recurring_transactions (user_id, next_occurrence_date);

-- "Compra de R$ 3.600 em 12x gera 12 ocorrências de R$ 300 vinculadas à mesma compra."
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  total_amount numeric not null check (total_amount > 0),
  installment_count integer not null check (installment_count > 0),
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  card_id uuid references public.cards (id) on delete set null,
  first_installment_date date not null,
  created_at timestamptz not null default now()
);

create index installments_user_id_idx on public.installments (user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  amount numeric not null check (amount > 0),
  transaction_type public.transaction_type not null,
  category_id uuid references public.categories (id) on delete set null,
  date date not null,
  status public.transaction_status not null default 'concluida',
  account_id uuid references public.accounts (id) on delete set null,
  transfer_to_account_id uuid references public.accounts (id) on delete set null,
  card_id uuid references public.cards (id) on delete set null,
  payment_method public.payment_method,
  tags text[] not null default '{}',
  note text,
  document_id uuid references public.documents (id) on delete set null,
  recurring_transaction_id uuid references public.recurring_transactions (id) on delete set null,
  installment_id uuid references public.installments (id) on delete set null,
  installment_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_transfer_requires_target check (
    (transaction_type = 'transferencia' and transfer_to_account_id is not null)
    or (transaction_type <> 'transferencia')
  )
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_user_date_idx on public.transactions (user_id, date);
create index transactions_user_status_idx on public.transactions (user_id, status);
create index transactions_recurring_id_idx on public.transactions (recurring_transaction_id);
create index transactions_installment_id_idx on public.transactions (installment_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  limit_amount numeric not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_unique_category_period unique (user_id, category_id, year_month)
);

create index budgets_user_id_idx on public.budgets (user_id);

alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.installments enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

create policy "cards_select_own" on public.cards for select using (auth.uid() = user_id);
create policy "cards_insert_own" on public.cards for insert with check (auth.uid() = user_id);
create policy "cards_update_own" on public.cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cards_delete_own" on public.cards for delete using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

create policy "recurring_transactions_select_own" on public.recurring_transactions for select using (auth.uid() = user_id);
create policy "recurring_transactions_insert_own" on public.recurring_transactions for insert with check (auth.uid() = user_id);
create policy "recurring_transactions_update_own" on public.recurring_transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_transactions_delete_own" on public.recurring_transactions for delete using (auth.uid() = user_id);

create policy "installments_select_own" on public.installments for select using (auth.uid() = user_id);
create policy "installments_insert_own" on public.installments for insert with check (auth.uid() = user_id);
create policy "installments_delete_own" on public.installments for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create trigger recurring_transactions_set_updated_at before update on public.recurring_transactions for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
