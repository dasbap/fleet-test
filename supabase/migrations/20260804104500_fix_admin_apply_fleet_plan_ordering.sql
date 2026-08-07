-- Keep admin plan assignment compatible with abonnements schemas that do not have created_at.

create or replace function public.admin_apply_fleet_plan_internal(
  p_fleet_id uuid,
  p_plan_code text,
  p_admin_user_id uuid default null,
  p_reason text default null,
  p_replace_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id uuid;
  v_current record;
  v_subscription_id uuid;
  v_plan_code text := lower(trim(p_plan_code));
begin
  if p_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if v_plan_code = '' then
    raise exception 'plan_code_required';
  end if;

  select id into v_plan_id
    from public.plans
   where code = v_plan_code
     and coalesce(is_active, true) = true
   limit 1;

  if v_plan_id is null then
    raise exception 'plan_not_found:%', v_plan_code;
  end if;

  select a.id, p.code
    into v_current
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
   where a.fleet_id = p_fleet_id
     and a.status in ('active', 'trial')
     and (a.ends_at is null or a.ends_at > now())
   order by a.starts_at desc nulls last, a.id desc
   limit 1;

  if v_current.id is not null and v_current.code = v_plan_code then
    return jsonb_build_object(
      'ok', true,
      'fleet_id', p_fleet_id,
      'plan_code', v_plan_code,
      'subscription_id', v_current.id,
      'unchanged', true
    );
  end if;

  if v_current.id is not null and not p_replace_existing then
    return jsonb_build_object(
      'ok', true,
      'fleet_id', p_fleet_id,
      'plan_code', v_current.code,
      'subscription_id', v_current.id,
      'unchanged', true,
      'kept_existing_plan', true
    );
  end if;

  update public.abonnements
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = p_admin_user_id,
         ends_at = least(coalesce(ends_at, now()), now())
   where fleet_id = p_fleet_id
     and status in ('active', 'trial')
     and (ends_at is null or ends_at > now());

  insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status)
  values (p_fleet_id, v_plan_id, null, now(), now() + interval '1 year', 'active')
  returning id into v_subscription_id;

  perform public.admin_log_action(
    p_admin_user_id,
    case when p_replace_existing then 'fleet_plan_changed' else 'fleet_plan_defaulted' end,
    'fleet',
    p_fleet_id,
    v_plan_code,
    jsonb_build_object('plan_code', v_plan_code, 'reason', p_reason, 'subscription_id', v_subscription_id)
  );

  return jsonb_build_object(
    'ok', true,
    'fleet_id', p_fleet_id,
    'plan_code', v_plan_code,
    'subscription_id', v_subscription_id
  );
end;
$$;

revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from public;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from anon;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from authenticated;

notify pgrst, 'reload schema';
