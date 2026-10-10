-- Privacidade do perfil. O perfil do Qqorvex é visível só para a própria pessoa (e para o Dono,
-- na Central); nada dele é público. Duas coisas ainda saíam sem pedir:
--   1. O @usuário do Qqorvex era enviado ao Discord junto com os cargos vinculados e aparecia no
--      perfil do Discord. Agora só vai se a pessoa ativar em Configurações → Conexões.
--   2. A foto ficava num bucket público. Esta migration cria a leitura só pelo dono, que o app usa
--      para gerar links temporários; a migration seguinte fecha o bucket depois que o app novo
--      estiver no ar (para nenhuma foto quebrar no meio do caminho).

alter table public.discord_connections
  add column share_username boolean not null default false;

-- Conexões existentes passam a não publicar o @usuário. Zerar synced_at faz a sincronização de
-- hora em hora reenviar os cargos sem ele.
update public.discord_connections set synced_at = null;

create or replace function public.get_my_discord_connection()
returns jsonb
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select jsonb_build_object(
    'username', connection.discord_username,
    'roles', connection.role_metadata,
    'synced_at', connection.synced_at,
    'share_username', connection.share_username
  )
  from public.discord_connections as connection
  where connection.user_id = auth.uid();
$$;

revoke all on function public.get_my_discord_connection() from public, anon;
grant execute on function public.get_my_discord_connection() to authenticated;

-- Foto de perfil: só o dono lê o próprio arquivo (base para createSignedUrl).
create policy avatars_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
