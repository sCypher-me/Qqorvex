-- Mantém os eventos de auditoria do Auth por até 90 dias, conforme a política
-- exibida na Central de Segurança. O cron extension já é habilitado no projeto.
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'qqorvex-auth-audit-retention-90d';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'qqorvex-auth-audit-retention-90d',
  '20 3 * * *',
  $$delete from auth.audit_log_entries where created_at < now() - interval '90 days';$$
);
