create or replace function public.admin_finalize_demo_request(
  p_request_id uuid,
  p_status public.demo_request_status,
  p_reason text default null,
  p_provisioned_user_id uuid default null,
  p_invitation_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_template text;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('accepted', 'refused', 'auto_accepted', 'auto_refused') then
    raise exception 'invalid_status';
  end if;

  update public.demo_requests
  set status = p_status,
      decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      admin_interacted_at = coalesce(admin_interacted_at, now()),
      provisioned_user_id = p_provisioned_user_id,
      invitation_url = p_invitation_url
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'demo_request_not_found_or_processed';
  end if;

  if to_regclass('public.notification_queue') is not null and v_request.email is not null then
    v_template := case
      when p_status in ('accepted', 'auto_accepted') then 'demo_request_accepted'
      else 'demo_request_refused'
    end;

    insert into public.notification_queue (to_email, template_id, metadata)
    values (
      v_request.email,
      v_template,
      jsonb_build_object(
        'request_id', v_request.id,
        'user_name', v_request.full_name,
        'full_name', v_request.full_name,
        'company_name', v_request.company,
        'company', v_request.company,
        'status', p_status,
        'reason', nullif(trim(coalesce(p_reason, '')), ''),
        'user_id', p_provisioned_user_id,
        'invitation_url', p_invitation_url
      )
    );

    update public.demo_requests
    set processed_email_queued_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object('ok', true, 'request_id', p_request_id, 'status', p_status);
end;
$$;
