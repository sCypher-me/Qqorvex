-- Token de estado opaco pro fluxo OAuth do Google Calendar: o cliente autenticado insere uma
-- linha antes de redirecionar (o `id` gerado vira o parâmetro `state`), e a Edge Function de
-- callback (que roda sem sessão de usuário — é o Google chamando) usa o `id` recebido de volta
-- pra descobrir de qual usuário era a solicitação, sem precisar de segredo de assinatura nenhum.
create table public.google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.google_oauth_states enable row level security;

create policy "google_oauth_states_insert_own" on public.google_oauth_states for insert with check (auth.uid() = user_id);
-- Sem select/update/delete pra usuários: só a Edge Function (service_role) lê e remove depois de
-- consumir o token, no callback do OAuth.
