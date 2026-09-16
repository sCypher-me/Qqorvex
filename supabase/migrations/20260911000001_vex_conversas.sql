-- Fase 1 do "Vex Context Engine" (docs/decisions/vex-context-engine-design.md): conversas
-- persistidas. Só guardamos role in ('user','assistant') porque é só isso que `runVexTurn` usa
-- como `messages: ChatMessage[]` — mensagens `tool` são efêmeras (construídas na hora dentro de
-- `executeAndSummarize`, nunca voltam pro histórico), e a mensagem `system` (personalidade da
-- Vex) é montada em runtime pelo cliente, não persistida.
create table public.vex_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vex_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.vex_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.vex_conversations enable row level security;
alter table public.vex_messages enable row level security;

create policy "vex_conversations_select_own" on public.vex_conversations for select using (auth.uid() = user_id);
create policy "vex_conversations_insert_own" on public.vex_conversations for insert with check (auth.uid() = user_id);
create policy "vex_conversations_update_own" on public.vex_conversations for update using (auth.uid() = user_id);
create policy "vex_conversations_delete_own" on public.vex_conversations for delete using (auth.uid() = user_id);

create policy "vex_messages_select_own" on public.vex_messages for select using (
  exists (select 1 from public.vex_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
create policy "vex_messages_insert_own" on public.vex_messages for insert with check (
  exists (select 1 from public.vex_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
create policy "vex_messages_delete_own" on public.vex_messages for delete using (
  exists (select 1 from public.vex_conversations c where c.id = conversation_id and c.user_id = auth.uid())
);
