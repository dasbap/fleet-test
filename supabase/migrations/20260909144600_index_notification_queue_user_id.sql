create index if not exists notification_queue_user_id_idx
  on public.notification_queue ((metadata->>'user_id'), status)
  where status = 'pending';
