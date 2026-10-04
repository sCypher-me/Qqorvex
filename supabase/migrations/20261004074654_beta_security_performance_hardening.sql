-- Keep investment position RLS checks cacheable within each statement.
alter policy investment_positions_select_own on public.investment_positions
  using (user_id = (select auth.uid()));
alter policy investment_positions_insert_own on public.investment_positions
  with check (user_id = (select auth.uid()));
alter policy investment_positions_update_own on public.investment_positions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy investment_positions_delete_own on public.investment_positions
  using (user_id = (select auth.uid()));

-- Support the user_id foreign key lookup and deletion cascade for notifications.
create index if not exists user_badge_notifications_user_id_idx
  on public.user_badge_notifications (user_id);

-- Match avatar object MIME validation at storage, not only in the client.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'avatars';
