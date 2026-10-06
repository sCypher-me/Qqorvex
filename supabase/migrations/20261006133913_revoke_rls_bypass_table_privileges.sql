-- Row-level security does not apply to TRUNCATE or trigger installation. Authenticated clients
-- need row-scoped CRUD only; anonymous clients receive no direct table access.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- All current public tables are owned by postgres, the role that runs application migrations.
-- Keep row-scoped CRUD for the app and prevent future application tables from inheriting
-- anonymous access or RLS-bypass privileges.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, public;
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from authenticated;
