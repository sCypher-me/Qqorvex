-- Memória da Vex com consentimento (backlog, seção 3): só o que a pessoa pediu para lembrar ou
-- confirmou num cartão. Ela vê, edita e apaga em Configurações → Aparência → Memória da Vex.
-- Nada é guardado automaticamente; o conteúdo vai no contexto das conversas seguintes.

create schema if not exists app_private;

create table if not exists public.vex_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vex_memories_user_created_idx on public.vex_memories (user_id, created_at desc);

alter table public.vex_memories enable row level security;

drop policy if exists vex_memories_select_own on public.vex_memories;
drop policy if exists vex_memories_insert_own on public.vex_memories;
drop policy if exists vex_memories_update_own on public.vex_memories;
drop policy if exists vex_memories_delete_own on public.vex_memories;
create policy vex_memories_select_own on public.vex_memories for select to authenticated using (user_id = (select auth.uid()));
create policy vex_memories_insert_own on public.vex_memories for insert to authenticated with check (user_id = (select auth.uid()));
create policy vex_memories_update_own on public.vex_memories for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy vex_memories_delete_own on public.vex_memories for delete to authenticated using (user_id = (select auth.uid()));

-- Limite de 50 memórias por pessoa (num gatilho: contar dentro da política recursaria).
create or replace function app_private.vex_memories_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.vex_memories m where m.user_id = new.user_id) >= 50 then
    raise exception 'vex_memory_limit' using errcode = 'P0001', hint = 'Apague alguma memória antes de guardar outra.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.vex_memories_limit() from public, anon, authenticated;

drop trigger if exists vex_memories_limit on public.vex_memories;
create trigger vex_memories_limit before insert on public.vex_memories for each row execute function app_private.vex_memories_limit();

revoke all on public.vex_memories from anon;
grant select, insert, update, delete on public.vex_memories to authenticated;
