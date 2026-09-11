do $$
begin
  if to_regclass('public.notification_queue') is null then
    return;
  end if;

  alter table public.notification_queue
    drop constraint if exists notification_queue_status_check;

  alter table public.notification_queue
    add constraint notification_queue_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped', 'abandoned'));
end $$;
