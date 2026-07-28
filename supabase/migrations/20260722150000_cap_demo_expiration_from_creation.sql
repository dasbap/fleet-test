-- Cap admin demo expiration changes at one month from demo creation.

create or replace function public.reactivate_demo_account(
  p_user_id uuid,
  p_reactivated_by uuid,
  p_extend_hours integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_duration integer;
  v_requested_expires timestamptz;
  v_max_expires timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type, created_at
    into v_rec
    from public.demo_profiles
   where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  v_max_expires := v_rec.created_at + interval '1 month';

  if p_extend_hours is not null then
    if p_extend_hours < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid_extension');
    end if;

    v_requested_expires := now() + (p_extend_hours || ' hours')::interval;
  else
    v_duration := public.get_demo_account_type_duration(v_rec.account_type);
    v_requested_expires := now() + (v_duration || ' hours')::interval;
  end if;

  if v_requested_expires > v_max_expires then
    return jsonb_build_object(
      'ok', false,
      'error', 'max_demo_extension_exceeded',
      'max_expires_at', v_max_expires
    );
  end if;

  update public.demo_profiles
     set is_active = true,
         expires_at = v_requested_expires,
         notified_at = null,
         deactivated_at = null,
         deactivated_by = null
   where user_id = p_user_id;

  insert into public.demo_expiration_log (user_id, email, account_type, action, reason, performed_by)
  values (
    v_rec.user_id,
    v_rec.email,
    v_rec.account_type,
    'reactivated',
    'reactivated by platform admin; capped at one month from creation',
    p_reactivated_by
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'expires_at', v_requested_expires);
end;
$$;

comment on function public.reactivate_demo_account(uuid, uuid, integer) is
  'Reactivates a demo account only as a demo. Expiration cannot exceed demo_profiles.created_at + 1 month.';

grant execute on function public.reactivate_demo_account(uuid, uuid, integer) to authenticated;

notify pgrst, 'reload schema';
