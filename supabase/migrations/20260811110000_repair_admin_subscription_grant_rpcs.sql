-- Repair admin subscription grant RPCs after 20260810120000 was already marked
-- applied on remote projects before these runtime objects were present.

alter table public.plans
  add column if not exists max_vehicles_per_subscription integer;

alter table public.abonnements
  add column if not exists vehicle_slots integer;

update public.plans
set max_vehicles_per_subscription = case
  when code = 'enterprise' then null
  when code = 'pro' then coalesce(max_vehicles, 100)
  else 1
end
where max_vehicles_per_subscription is null;

create or replace function public.admin_list_subscription_grant_options()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
set row_security = off
as $$
declare
  v_fleets jsonb;
  v_plans jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  if not public.is_platform_super_admin() then
    raise exception 'permission_refusee_super_admin_abonnement';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'org_id', f.org_id
  ) order by f.name asc nulls last, f.id asc), '[]'::jsonb)
  into v_fleets
  from public.flottes f;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', p.code,
    'name', p.name
  ) order by case p.code when 'starter' then 1 when 'pro' then 2 when 'enterprise' then 3 else 10 end, p.code), '[]'::jsonb)
  into v_plans
  from public.plans p
  where coalesce(p.is_active, true) = true;

  return jsonb_build_object(
    'fleets', v_fleets,
    'plans', v_plans
  );
end;
$$;

drop function if exists public.admin_create_fleet_subscription(uuid, text, integer, text);
drop function if exists public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, text);
create or replace function public.admin_create_fleet_subscription(
  p_fleet_id uuid,
  p_plan_code text,
  p_expires_at timestamptz default null,
  p_permanent boolean default false,
  p_replace_existing boolean default false,
  p_vehicle_slots integer default 1,
  p_status text default 'active'
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan record;
  v_subscription_id uuid;
  v_plan_code text := lower(trim(coalesce(p_plan_code, '')));
  v_status text := lower(trim(coalesce(p_status, 'active')));
  v_ends_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  if not public.is_platform_super_admin() then
    raise exception 'permission_refusee_super_admin_abonnement';
  end if;

  if p_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if v_plan_code = '' then
    raise exception 'plan_code_required';
  end if;

  if v_status not in ('trial', 'active') then
    raise exception 'subscription_status_invalid';
  end if;

  if coalesce(p_vehicle_slots, 0) <= 0 then
    raise exception 'vehicle_slots_must_be_positive';
  end if;

  v_ends_at := case
    when p_permanent then '9999-12-31 23:59:59+00'::timestamptz
    else p_expires_at
  end;

  if v_ends_at is null then
    raise exception 'expires_at_required';
  end if;

  if v_ends_at <= now() then
    raise exception 'expires_at_must_be_future';
  end if;

  select id, code, name
  into v_plan
  from public.plans
  where code = v_plan_code
    and coalesce(is_active, true) = true
  limit 1;

  if v_plan.id is null then
    raise exception 'plan_not_found:%', v_plan_code;
  end if;

  if not exists (select 1 from public.flottes where id = p_fleet_id) then
    raise exception 'fleet_not_found';
  end if;

  if p_replace_existing then
    update public.abonnements
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = auth.uid(),
        ends_at = least(coalesce(ends_at, now()), now())
    where fleet_id = p_fleet_id
      and status in ('active', 'trial')
      and coalesce(ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now();
  end if;

  insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status, vehicle_slots)
  values (
    p_fleet_id,
    v_plan.id,
    null,
    now(),
    v_ends_at,
    v_status,
    p_vehicle_slots
  )
  returning id into v_subscription_id;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      p_fleet_id,
      v_subscription_id,
      'subscription.admin_created',
      jsonb_build_object(
        'actor_id', auth.uid(),
        'plan_code', v_plan.code,
        'expires_at', v_ends_at,
        'permanent', p_permanent,
        'replace_existing', p_replace_existing,
        'vehicle_slots', p_vehicle_slots,
        'status', v_status,
        'source', 'super_admin_grant'
      )
    );
  end if;

  if to_regprocedure('public.admin_log_action(uuid,text,text,uuid,text,jsonb)') is not null then
    perform public.admin_log_action(
      auth.uid(),
      'fleet_subscription_created',
      'fleet',
      p_fleet_id,
      v_plan.code,
      jsonb_build_object(
        'subscription_id', v_subscription_id,
        'plan_code', v_plan.code,
        'expires_at', v_ends_at,
        'permanent', p_permanent,
        'replace_existing', p_replace_existing,
        'vehicle_slots', p_vehicle_slots,
        'status', v_status
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'fleet_id', p_fleet_id,
    'plan_code', v_plan.code,
    'subscription_id', v_subscription_id,
    'expires_at', v_ends_at,
    'permanent', p_permanent,
    'vehicle_slots', p_vehicle_slots,
    'status', v_status
  );
end;
$$;

revoke execute on function public.admin_list_subscription_grant_options() from public;
revoke execute on function public.admin_list_subscription_grant_options() from anon;
grant execute on function public.admin_list_subscription_grant_options() to authenticated;
revoke execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) from public;
revoke execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) from anon;
grant execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) to authenticated;

notify pgrst, 'reload schema';
