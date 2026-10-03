-- Excluir uma conta pelo Painel Manager — só o dono, nunca a própria conta por aqui (usar o
-- fluxo normal de "excluir minha conta" pra isso, fora de escopo desta função).
create or replace function public.delete_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Só o dono pode excluir contas.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Use a opção de excluir a própria conta, não esta.';
  end if;
  delete from auth.users where id = target_user_id;
end;
$$;

revoke execute on function public.delete_account(uuid) from public, anon;
grant execute on function public.delete_account(uuid) to authenticated;
