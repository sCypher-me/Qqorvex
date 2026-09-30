-- Cofre protegido no servidor. Antes, o PIN só escondia os documentos na tela: com a sessão
-- aberta, a API ainda listava, lia o texto do OCR e baixava arquivos do Cofre. Agora:
-- - desbloquear é uma ação no servidor (unlock_vault), presa à sessão de login atual (claim
--   session_id do JWT) e válida por 15 minutos; outro aparelho continua bloqueado;
-- - as RLS de documents e do bucket "documents" só liberam itens do Cofre com desbloqueio válido
--   (versões, relações e datas importantes seguem, porque as policies delas consultam documents);
-- - pôr um documento NO Cofre continua permitido bloqueado (esconder não pede PIN).

create table if not exists app_private.vault_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  expires_at timestamptz not null,
  primary key (user_id, session_id)
);

alter table app_private.vault_unlocks enable row level security;
revoke all on table app_private.vault_unlocks from public, anon, authenticated;

-- Sessão atual (claim session_id). Sem ela não existe desbloqueio possível.
create or replace function app_private.current_session_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid
$$;

-- Usada nas policies: há desbloqueio válido para esta pessoa NESTA sessão?
create or replace function app_private.vault_is_unlocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.vault_unlocks u
    where u.user_id = auth.uid()
      and u.session_id = app_private.current_session_id()
      and u.expires_at > now()
  )
$$;

-- Objeto do bucket "documents" ({user}/{document}/...) pode ser lido/alterado? Só se o documento
-- não for do Cofre, ou se o Cofre estiver desbloqueado. SECURITY DEFINER para enxergar is_vault
-- mesmo quando a RLS de documents esconde a linha.
create or replace function app_private.document_object_accessible(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1
      from public.documents d
      where d.id::text = (storage.foldername(object_name))[2]
        and d.is_vault
    )
    or app_private.vault_is_unlocked()
$$;

revoke all on function app_private.current_session_id() from public, anon;
revoke all on function app_private.vault_is_unlocked() from public, anon;
revoke all on function app_private.document_object_accessible(text) from public, anon;
grant execute on function app_private.current_session_id() to authenticated;
grant execute on function app_private.vault_is_unlocked() to authenticated;
grant execute on function app_private.document_object_accessible(text) to authenticated;

-- Confere o PIN (mesma regra de bloqueio de verify_security_pin: 5 erros → 5 minutos) e, se
-- estiver certo, desbloqueia o Cofre nesta sessão por 15 minutos. Devolve até quando vale, ou
-- null se o PIN estiver errado/bloqueado.
create or replace function public.unlock_vault(pin text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session uuid := app_private.current_session_id();
  until timestamptz := now() + interval '15 minutes';
begin
  if auth.uid() is null or current_session is null then
    raise exception 'Sessão inválida para desbloquear o Cofre.' using errcode = '28000';
  end if;
  if not public.verify_security_pin(pin) then
    return null;
  end if;
  delete from app_private.vault_unlocks where user_id = auth.uid() and expires_at <= now();
  insert into app_private.vault_unlocks (user_id, session_id, expires_at)
  values (auth.uid(), current_session, until)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  return until;
end;
$$;

create or replace function public.lock_vault()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from app_private.vault_unlocks
  where user_id = auth.uid() and session_id = app_private.current_session_id()
$$;

-- Até quando o Cofre está aberto nesta sessão (null = bloqueado). A tela usa ao carregar.
create or replace function public.vault_unlocked_until()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select u.expires_at
  from app_private.vault_unlocks u
  where u.user_id = auth.uid()
    and u.session_id = app_private.current_session_id()
    and u.expires_at > now()
$$;

-- Quantos documentos há no Cofre (a RLS esconde as linhas quando bloqueado; o número não é
-- sensível e a tela precisa dele para mostrar "N documentos no Cofre").
create or replace function public.count_my_vault_documents()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.documents
  where user_id = auth.uid() and is_vault and deleted_at is null and not is_archived
$$;

-- Pôr um documento no Cofre sem PIN. Um UPDATE direto falharia com o Cofre bloqueado: o Postgres
-- exige que a linha atualizada continue visível a quem atualizou, e ela passa a ser do Cofre.
-- Só o dono, e só nesta direção — tirar do Cofre continua exigindo desbloqueio.
create or replace function public.move_document_to_vault(document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents set is_vault = true where id = document_id and user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.unlock_vault(text) from public, anon;
revoke all on function public.lock_vault() from public, anon;
revoke all on function public.vault_unlocked_until() from public, anon;
revoke all on function public.count_my_vault_documents() from public, anon;
revoke all on function public.move_document_to_vault(uuid) from public, anon;
grant execute on function public.unlock_vault(text) to authenticated;
grant execute on function public.lock_vault() to authenticated;
grant execute on function public.vault_unlocked_until() to authenticated;
grant execute on function public.count_my_vault_documents() to authenticated;
grant execute on function public.move_document_to_vault(uuid) to authenticated;

-- documents: ler, editar e apagar itens do Cofre exige desbloqueio. O WITH CHECK do update só
-- exige ser o dono, para que pôr um documento no Cofre funcione mesmo bloqueado.
drop policy if exists documents_select_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_delete_own on public.documents;

create policy documents_select_own on public.documents
  for select to authenticated
  using (auth.uid() = user_id and (not is_vault or (select app_private.vault_is_unlocked())));

create policy documents_update_own on public.documents
  for update to authenticated
  using (auth.uid() = user_id and (not is_vault or (select app_private.vault_is_unlocked())))
  with check (auth.uid() = user_id);

create policy documents_delete_own on public.documents
  for delete to authenticated
  using (auth.uid() = user_id and (not is_vault or (select app_private.vault_is_unlocked())));

-- Bucket "documents": baixar, gerar link, copiar (nova versão), substituir ou apagar arquivo do
-- Cofre exige desbloqueio. O upload mantém a checagem de cota (can_upload_document).
drop policy if exists documents_storage_select_own on storage.objects;
drop policy if exists documents_storage_update_own on storage.objects;
drop policy if exists documents_storage_delete_own on storage.objects;
drop policy if exists documents_storage_insert_own on storage.objects;

create policy documents_storage_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and app_private.document_object_accessible(name)
  );

create policy documents_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and app_private.can_upload_document((select auth.uid()), name, metadata)
    and app_private.document_object_accessible(name)
  );

create policy documents_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and app_private.document_object_accessible(name)
  )
  with check (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and app_private.can_upload_document((select auth.uid()), name, metadata)
    and app_private.document_object_accessible(name)
  );

create policy documents_storage_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and app_private.document_object_accessible(name)
  );
