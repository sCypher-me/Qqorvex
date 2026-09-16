# Central de Segurança — Sessões/Dispositivos (design)

Escopo definido com o usuário em 11/09/2026 via brainstorming, primeiro sub-projeto da "Central de
Segurança" mais completa que o Xmind descreve (as outras peças — PIN, e a evolução da barreira do
Cofre da Vex pra "autorizar agora" — ficam para depois, como sub-projetos independentes).

## Decisão de escopo

Sessões/dispositivos e PIN são independentes entre si — dá pra construir e testar um sem o outro.
Este documento cobre só sessões/dispositivos.

## Achados técnicos que moldaram o design

- `supabase.auth.signOut({ scope: "others" })` já existe pronto no SDK — sai de todas as sessões
  exceto a atual, sem nenhum código novo no backend.
- O schema `auth` (onde `auth.sessions` mora) **não é exposto pela API automática do Supabase por
  segurança** — listar sessões individuais com metadados (`user_agent`, `ip`, `refreshed_at`)
  exige uma função Postgres própria (`security definer`), não uma tabela com RLS normal.
- `auth.sessions` tem as colunas necessárias: `id`, `user_id`, `created_at`, `refreshed_at`,
  `not_after`, `user_agent`, `ip`. Apagar a linha invalida o refresh token na hora (documentado
  pelo próprio Supabase — "sessions affected by the logout are removed from the database
  entirely").

## Schema — duas funções RPC, sem tabela nova

```sql
create or replace function public.list_my_sessions()
returns table (id uuid, created_at timestamptz, refreshed_at timestamptz, not_after timestamptz, user_agent text, ip text)
language sql security definer set search_path = ''
as $$
  select s.id, s.created_at, s.refreshed_at, s.not_after, s.user_agent, s.ip::text
  from auth.sessions s where s.user_id = auth.uid()
  order by coalesce(s.refreshed_at, s.created_at) desc;
$$;

create or replace function public.revoke_my_session(target_session_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if target_session_id = (auth.jwt() ->> 'session_id')::uuid then
    raise exception 'Não é possível revogar a sessão atual por aqui.';
  end if;
  delete from auth.sessions where id = target_session_id and user_id = auth.uid();
end;
$$;

grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
```

`security definer` é o mesmo padrão já usado no trigger de criação de perfil (`handle_new_user`) —
cada função só enxerga o que pertence a `auth.uid()`. `revoke_my_session` recusa explicitamente
revogar a própria sessão atual por engano (compara com o claim `session_id` do JWT).

## Cliente (`packages/auth`)

Novo `packages/auth/src/sessions.ts`:
- `listSessions(client)` — chama `client.rpc("list_my_sessions")`.
- `revokeSession(client, sessionId)` — chama `client.rpc("revoke_my_session", { target_session_id: sessionId })`.
- `getCurrentSessionId(client)` — decodifica o claim `session_id` do access token já em memória
  (`client.auth.getSession()`), sem chamada de rede extra.
- `parseUserAgent(userAgent)` — parser leve por regex (Chrome/Firefox/Safari/Edge ×
  Windows/Mac/Linux/Android/iOS), sem dependência nova, só pra exibição amigável.

Novo `useSessions.ts` — mesmo padrão local de `useMfaFactors`/`usePasskeys` (sem TanStack Query,
convenção só de `modules/*`): `{ sessions, currentSessionId, isLoading, refresh }`.

## UI

Nova seção "Dispositivos" em `/seguranca`, mesmo padrão visual das demais seções (card com
`h2` + lista). Cada sessão mostra navegador/SO parseado, IP, "ativo há X" a partir de
`refreshed_at`; a sessão atual é destacada ("Este dispositivo", sem botão de remover); as demais
têm botão "Sair" (chama `revokeSession` + `refresh()`). Botão "Sair de todos os outros
dispositivos" no topo da seção, usando `signOut({ scope: "others" })` diretamente — não depende
das funções novas.

## Teste

**Implementado e testado em 11/09/2026.** Descoberta durante o teste: `create or replace function`
no Supabase concede `EXECUTE` a `anon`/`authenticated` automaticamente (default privileges) — o
advisor de segurança acusou `anon` conseguindo chamar as duas funções mesmo só tendo dado
`grant ... to authenticated` explícito; corrigido com `revoke execute ... from anon` explícito
(revogar de `public` não bastou, porque o grant a `anon` é direto, não herdado). Consegui simular
`auth.uid()`/`auth.jwt()` de verdade via `set_config('request.jwt.claims', ...)` +
`set_config('role', 'authenticated', true)` no próprio SQL Editor (contra as 3 sessões reais do
usuário confirmado): `list_my_sessions()` retornou só as sessões do usuário certo, ordenadas por
atividade; `revoke_my_session()` recusou revogar a própria sessão atual (`RAISE EXCEPTION`) e
revogou com sucesso uma sessão diferente (uma sessão órfã, nunca renovada, sobrevivente de um
login antigo — removida de verdade, sem afetar a sessão ativa real); um `user_id` falso não viu
nem conseguiu apagar as sessões do usuário real (isolamento entre usuários confirmado). Typecheck
e build limpos. UI (`/seguranca`, seção "Dispositivos") ainda sem teste de clique real — fica pro
usuário conferir, idealmente logado em dois navegadores ao mesmo tempo pra ver a revogação
derrubar a outra sessão de verdade.
