-- A conta administrativa do Dono recebe Plus permanente como benefício da plataforma.
-- O papel `role` é protegido por privilégios de coluna e não pode ser alterado pelo próprio usuário.
-- Assinaturas pagas continuam sendo concedidas pelo fluxo de cobrança normal para as demais contas.
create or replace function public.has_plus_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'dono'
  ) or exists (
    select 1
    from public.billing_subscriptions s
    where s.user_id = p_user_id
      and s.plan_key = 'plus'
      and s.status in ('active', 'trialing', 'canceled')
      and s.current_period_end > now()
  );
$$;

revoke all on function public.has_plus_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.has_plus_entitlement(uuid) to service_role;
