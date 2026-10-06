-- Keep the Storage API's row-scoped operations intact while removing privileges that
-- bypass object policies or permit clients to alter database triggers.
revoke truncate, trigger, references on table storage.objects from anon, authenticated;
