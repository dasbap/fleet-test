create or replace function public.cancel_pending_demo_acceptance_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_queue
  set
    status = 'abandoned',
    error_msg = 'target_account_deleted_before_delivery',
    updated_at = now()
  where status = 'pending'
    and template_id = 'demo_request_accepted'
    and metadata @> jsonb_build_object('user_id', old.user_id::text);

  return old;
end;
$$;

drop trigger if exists trg_cancel_pending_demo_acceptance_email on public.demo_sessions;
create trigger trg_cancel_pending_demo_acceptance_email
after delete on public.demo_sessions
for each row
execute function public.cancel_pending_demo_acceptance_email();

update public.notification_queue q
set
  status = 'abandoned',
  error_msg = 'target_account_deleted_before_delivery',
  updated_at = now()
where q.status = 'pending'
  and q.template_id = 'demo_request_accepted'
  and nullif(q.metadata->>'user_id', '') is not null
  and not exists (
    select 1
    from auth.users u
    where u.id = nullif(q.metadata->>'user_id', '')::uuid
  );
