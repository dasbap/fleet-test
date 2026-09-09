create or replace function public.release_notification_email_send(p_queue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  delete from public.email_send_reservations
  where queue_id = p_queue_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.release_notification_email_send(uuid) from public;
grant execute on function public.release_notification_email_send(uuid) to service_role;
