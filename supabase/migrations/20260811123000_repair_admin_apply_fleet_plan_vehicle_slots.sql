-- Ensure legacy admin/demo plan assignment writes granted subscription vehicle slots.

alter table if exists public.plans
  add column if not exists max_vehicles_per_subscription integer;

alter table if exists public.abonnements
  add column if not exists vehicle_slots integer;

update public.abonnements a
   set vehicle_slots = greatest(1, least(
     coalesce(p.max_vehicles_per_subscription, p.max_vehicles, 3),
     coalesce(p.max_vehicles, p.max_vehicles_per_subscription, 999999)
   ))
  from public.plans p
 where p.id = a.plan_id
   and a.vehicle_slots is null
   and a.status in ('active', 'trial')
   and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now();

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
  v_plan_max integer;
  v_plan_subscription_max integer;
  v_vehicle_slots integer;
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

  select id, max_vehicles, max_vehicles_per_subscription
    into v_plan_id, v_plan_max, v_plan_subscription_max
    from public.plans
   where code = v_plan_code
     and coalesce(is_active, true) = true
   limit 1;

  if v_plan_id is null then
    raise exception 'plan_not_found:%', v_plan_code;
  end if;

  v_vehicle_slots := greatest(1, coalesce(v_plan_subscription_max, v_plan_max, 3));
  v_vehicle_slots := least(v_vehicle_slots, coalesce(v_plan_max, v_vehicle_slots));

  select a.id, p.code
    into v_current
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
   where a.fleet_id = p_fleet_id
     and a.status in ('active', 'trial')
     and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
   order by a.starts_at desc nulls last, a.id desc
   limit 1;

  if v_current.id is not null and v_current.code = v_plan_code then
    update public.abonnements
       set vehicle_slots = coalesce(vehicle_slots, v_vehicle_slots)
     where id = v_current.id;

    return jsonb_build_object(
      'ok', true,
      'fleet_id', p_fleet_id,
      'plan_code', v_plan_code,
      'subscription_id', v_current.id,
      'vehicle_slots', v_vehicle_slots,
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
     and coalesce(ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now();

  insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status, vehicle_slots)
  values (p_fleet_id, v_plan_id, null, now(), now() + interval '1 year', 'active', v_vehicle_slots)
  returning id into v_subscription_id;

  perform public.admin_log_action(
    p_admin_user_id,
    case when p_replace_existing then 'fleet_plan_changed' else 'fleet_plan_defaulted' end,
    'fleet',
    p_fleet_id,
    v_plan_code,
    jsonb_build_object(
      'plan_code', v_plan_code,
      'reason', p_reason,
      'subscription_id', v_subscription_id,
      'vehicle_slots', v_vehicle_slots
    )
  );

  return jsonb_build_object(
    'ok', true,
    'fleet_id', p_fleet_id,
    'plan_code', v_plan_code,
    'subscription_id', v_subscription_id,
    'vehicle_slots', v_vehicle_slots
  );
end;
$$;

revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from public;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from anon;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from authenticated;

notify pgrst, 'reload schema';
