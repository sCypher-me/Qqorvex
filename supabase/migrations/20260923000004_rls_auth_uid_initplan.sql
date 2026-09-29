-- Evita que auth.uid() seja reavaliado para cada linha da tabela.
-- O bloco é idempotente: policies já normalizadas pelo PostgreSQL não são reescritas.
do $$
declare
  p record;
  normalized_qual text;
  normalized_with_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    if p.qual is not null and p.qual !~* 'select[[:space:]]+auth\.uid\(\)' then
      normalized_qual := replace(p.qual, 'auth.uid()', '(select auth.uid())');
      execute format(
        'alter policy %I on %I.%I using (%s)',
        p.policyname, p.schemaname, p.tablename, normalized_qual
      );
    end if;

    if p.with_check is not null and p.with_check !~* 'select[[:space:]]+auth\.uid\(\)' then
      normalized_with_check := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        p.policyname, p.schemaname, p.tablename, normalized_with_check
      );
    end if;
  end loop;
end
$$;
