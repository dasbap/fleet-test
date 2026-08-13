-- Subscription vehicle slots and management RPCs.
-- This migration keeps the existing abonnements/droits_vehicules model and makes
-- that model authoritative for vehicle capacity, assignment, transfer and cleanup.

alter table public.plans
  add column if not exists max_vehicles_per_subscription integer;

alter table public.abonnements
  add column if not exists vehicle_slots integer;

alter table public.droits_vehicules
  add column if not exists associated_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz;

alter table public.vehicules
  add column if not exists archived_at timestamptz;

update public.plans
set max_vehicles_per_subscription = case
  when code = 'enterprise' then null
  when code = 'pro' then coalesce(max_vehicles, 100)
  else 1
end
where max_vehicles_per_subscription is null;

update public.droits_vehicules
set ended_at = now(), active = false
where active = true
  and id not in (
    select distinct on (vehicle_id) id
    from public.droits_vehicules
    where active = true
    order by vehicle_id, associated_at desc, id desc
  );

create unique index if not exists droits_vehicules_one_active_subscription_per_vehicle
  on public.droits_vehicules(vehicle_id)
  where active = true;

create index if not exists idx_droits_vehicules_subscription_active
  on public.droits_vehicules(subscription_id)
  where active = true;

create index if not exists idx_vehicules_archived_at
  on public.vehicules(archived_at);

create or replace function public.subscription_plan_capacity(p_plan_code text, p_plan_max integer, p_subscription_max integer)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'plan_code', p_plan_code,
    'fleet_max_vehicles', coalesce(p_plan_max, 999999),
    'vehicles_per_subscription',
      case
        when p_subscription_max is null then 999999
        when p_subscription_max > 0 then p_subscription_max
        when p_plan_code = 'pro' then coalesce(p_plan_max, 100)
        when p_plan_code = 'enterprise' then 999999
        else 1
      end,
    'allows_multiple_vehicles_per_subscription',
      case
        when p_plan_code in ('pro', 'enterprise') then true
        when p_subscription_max is null then true
        else coalesce(p_subscription_max, 1) > 1
      end
  );
$$;

create or replace function public.subscription_vehicle_capacity_model(
  p_plan_code text,
  p_plan_max integer,
  p_subscription_max integer
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when (public.subscription_plan_capacity(p_plan_code, p_plan_max, p_subscription_max)->>'vehicles_per_subscription')::int > 1
      then 'multi_vehicle'
    else 'single_vehicle'
  end;
$$;

create or replace function public.is_vehicle_subscription_status_active(p_status text)
returns boolean
language sql
immutable
as $$
  select p_status in ('trial', 'active');
$$;

create or replace function public.trg_enforce_same_active_subscription_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_model text;
  v_existing_model text;
begin
  if new.fleet_id is null or new.plan_id is null then
    return new;
  end if;

  if not public.is_vehicle_subscription_status_active(new.status) then
    return new;
  end if;

  if coalesce(new.ends_at, '9999-12-31 23:59:59+00'::timestamptz) <= now() then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.fleet_id::text, 2026081013));

  select public.subscription_vehicle_capacity_model(
    code,
    max_vehicles,
    coalesce(new.vehicle_slots, max_vehicles_per_subscription)
  )
  into v_new_model
  from public.plans
  where id = new.plan_id;

  if v_new_model is null then
    raise exception 'plan_not_found';
  end if;

  select public.subscription_vehicle_capacity_model(
    p.code,
    p.max_vehicles,
    coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
  )
  into v_existing_model
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.fleet_id = new.fleet_id
    and a.id is distinct from new.id
    and public.is_vehicle_subscription_status_active(a.status)
    and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
    and public.subscription_vehicle_capacity_model(
      p.code,
      p.max_vehicles,
      coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
    ) is distinct from v_new_model
  order by a.starts_at desc, a.id desc
  limit 1;

  if v_existing_model is not null then
    raise exception 'abonnement_type_incompatible'
      using hint = 'Une flotte peut avoir plusieurs abonnements actifs uniquement s''ils ont le meme modele vehicule.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_abonnements_same_active_subscription_plan on public.abonnements;
create trigger trg_abonnements_same_active_subscription_plan
before insert or update of fleet_id, plan_id, status, ends_at, vehicle_slots on public.abonnements
for each row
execute function public.trg_enforce_same_active_subscription_plan();

create or replace function public.get_subscription_available_slots(p_subscription_id uuid)
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_sub record;
  v_capacity jsonb;
  v_limit int;
  v_used int;
begin
  select a.id, a.status, a.vehicle_slots, p.code as plan_code, p.max_vehicles, p.max_vehicles_per_subscription
  into v_sub
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.id = p_subscription_id;

  if v_sub.id is null or not public.is_vehicle_subscription_status_active(v_sub.status) then
    return 0;
  end if;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    coalesce(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  select count(*)::int
  into v_used
  from public.droits_vehicules
  where subscription_id = p_subscription_id
    and active = true;

  return greatest(0, v_limit - v_used);
end;
$$;

create or replace function public.find_available_subscription_for_vehicle(p_fleet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));

  select s.id
  into v_subscription_id
  from (
    select a.id,
           public.get_subscription_available_slots(a.id) as available_slots,
           a.starts_at
    from public.abonnements a
    where a.fleet_id = p_fleet_id
      and public.is_vehicle_subscription_status_active(a.status)
    order by a.starts_at asc, a.id asc
    for update
  ) s
  where s.available_slots > 0
  order by s.starts_at asc, s.id asc
  limit 1;

  return v_subscription_id;
end;
$$;

create or replace function public.assign_vehicle_to_subscription(
  p_vehicle_id uuid,
  p_subscription_id uuid,
  p_actor_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle record;
  v_sub record;
  v_capacity jsonb;
  v_limit int;
  v_used int;
begin
  select id, fleet_id, registration
  into v_vehicle
  from public.vehicules
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'vehicule_introuvable';
  end if;

  select a.id, a.fleet_id, a.status, a.vehicle_slots, p.code as plan_code, p.max_vehicles, p.max_vehicles_per_subscription
  into v_sub
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.id = p_subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_sub.fleet_id::text, 2026081012));

  if v_sub.fleet_id is distinct from v_vehicle.fleet_id then
    raise exception 'abonnement_flotte_incompatible';
  end if;

  if not public.is_vehicle_subscription_status_active(v_sub.status) then
    raise exception 'abonnement_inactif';
  end if;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    coalesce(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  if exists (
    select 1
    from public.droits_vehicules
    where vehicle_id = p_vehicle_id
      and active = true
      and subscription_id <> p_subscription_id
  ) then
    raise exception 'vehicule_deja_associe_abonnement';
  end if;

  select count(*)::int
  into v_used
  from public.droits_vehicules
  where subscription_id = p_subscription_id
    and active = true;

  if v_used >= v_limit then
    raise exception 'limite_vehicules_abonnement_atteinte';
  end if;

  if (v_capacity->>'allows_multiple_vehicles_per_subscription')::boolean = false and v_used >= 1 then
    raise exception 'abonnement_standard_deja_utilise';
  end if;

  insert into public.droits_vehicules(vehicle_id, subscription_id, active, associated_at, ended_at)
  values (p_vehicle_id, p_subscription_id, true, now(), null)
  on conflict (vehicle_id, subscription_id) do update
    set active = true,
        associated_at = now(),
        ended_at = null;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      v_sub.fleet_id,
      p_subscription_id,
      'subscription.vehicle_assigned',
      jsonb_build_object('vehicle_id', p_vehicle_id, 'actor_id', p_actor_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', p_vehicle_id,
    'subscription_id', p_subscription_id
  );
end;
$$;

create or replace function public.transfer_vehicle_subscription(
  p_vehicle_id uuid,
  p_target_subscription_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle record;
  v_target record;
  v_check jsonb;
  v_old_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select id, fleet_id, registration
  into v_vehicle
  from public.vehicules
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'vehicule_introuvable';
  end if;

  select id, fleet_id, status
  into v_target
  from public.abonnements
  where id = p_target_subscription_id
  for update;

  if v_target.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  if v_target.fleet_id is distinct from v_vehicle.fleet_id then
    raise exception 'abonnement_flotte_incompatible';
  end if;

  v_check := public.rbac_check_permission('billing.manage', v_target.fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_abonnement';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_target.fleet_id::text, 2026081012));

  select subscription_id
  into v_old_subscription_id
  from public.droits_vehicules
  where vehicle_id = p_vehicle_id
    and active = true
  for update;

  if v_old_subscription_id = p_target_subscription_id then
    return jsonb_build_object('ok', true, 'vehicle_id', p_vehicle_id, 'subscription_id', p_target_subscription_id);
  end if;

  update public.droits_vehicules
  set active = false,
      ended_at = now()
  where vehicle_id = p_vehicle_id
    and active = true;

  perform public.assign_vehicle_to_subscription(p_vehicle_id, p_target_subscription_id, auth.uid());

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      v_target.fleet_id,
      p_target_subscription_id,
      'subscription.vehicle_transferred',
      jsonb_build_object(
        'vehicle_id', p_vehicle_id,
        'from_subscription_id', v_old_subscription_id,
        'to_subscription_id', p_target_subscription_id,
        'actor_id', auth.uid()
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', p_vehicle_id,
    'from_subscription_id', v_old_subscription_id,
    'subscription_id', p_target_subscription_id
  );
exception
  when others then
    raise;
end;
$$;

create or replace function public.trg_auto_assign_vehicle_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  v_subscription_id := public.find_available_subscription_for_vehicle(new.fleet_id);

  if v_subscription_id is null then
    raise exception 'limite_vehicules_abonnements_atteinte'
      using hint = 'Vous avez atteint la limite de vehicules autorisee par vos abonnements.';
  end if;

  perform public.assign_vehicle_to_subscription(new.id, v_subscription_id, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_vehicules_auto_assign_subscription on public.vehicules;
create trigger trg_vehicules_auto_assign_subscription
after insert on public.vehicules
for each row
execute function public.trg_auto_assign_vehicle_subscription();

create or replace function public.trg_enforce_fleet_vehicle_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots int;
  v_used int;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.fleet_id::text, 2026081012));

  select coalesce(sum((public.subscription_plan_capacity(p.code, p.max_vehicles, coalesce(a.vehicle_slots, p.max_vehicles_per_subscription))->>'vehicles_per_subscription')::int), 0)
  into v_slots
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.fleet_id = new.fleet_id
    and public.is_vehicle_subscription_status_active(a.status);

  select count(*)::int
  into v_used
  from public.droits_vehicules dv
  join public.abonnements a on a.id = dv.subscription_id
  where a.fleet_id = new.fleet_id
    and dv.active = true
    and public.is_vehicle_subscription_status_active(a.status);

  if v_slots <= 0 or v_used + 1 > v_slots then
    raise exception 'limite_vehicules_abonnements_atteinte'
      using hint = 'Vous avez atteint la limite de vehicules autorisee par vos abonnements.';
  end if;

  return new;
end;
$$;

create or replace function public.can_create_vehicle(p_fleet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with capacity as (
    select coalesce(sum((public.subscription_plan_capacity(p.code, p.max_vehicles, coalesce(a.vehicle_slots, p.max_vehicles_per_subscription))->>'vehicles_per_subscription')::int), 0) as slots
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
    where a.fleet_id = p_fleet_id
      and public.is_vehicle_subscription_status_active(a.status)
  ),
  used as (
    select count(*)::int as n
    from public.droits_vehicules dv
    join public.abonnements a on a.id = dv.subscription_id
    where a.fleet_id = p_fleet_id
      and dv.active = true
      and public.is_vehicle_subscription_status_active(a.status)
  )
  select (select slots from capacity) > (select n from used);
$$;

create or replace function public.get_plan_access(p_fleet_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active_sub as (
    select
      a.status,
      p.code as plan_code,
      p.max_vehicles,
      p.enables_finance,
      p.enables_ai,
      p.enables_reports,
      p.enables_driver_scoring,
      p.enables_anomaly_insights,
      p.enables_geofencing,
      p.enables_scheduled_reports,
      p.enables_offline_driver
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
    where a.fleet_id = p_fleet_id
      and public.is_vehicle_subscription_status_active(a.status)
    order by a.ends_at desc
    limit 1
  ),
  vcnt as (
    select count(*)::int as n from public.vehicules where fleet_id = p_fleet_id and archived_at is null
  )
  select case
    when not exists (select 1 from active_sub) then jsonb_build_object(
      'planCode', 'free',
      'canCreateVehicle', false,
      'canUsePulse', false,
      'canUseQrPremium', false,
      'canExportReports', false,
      'canUseFinance', false,
      'canAccessMultiFleet', false,
      'maxVehicles', 3,
      'vehicleCount', (select n from vcnt),
      'isActive', false
    )
    else jsonb_build_object(
      'planCode', (select plan_code from active_sub),
      'canCreateVehicle', public.can_create_vehicle(p_fleet_id),
      'canUsePulse', (select enables_ai from active_sub),
      'canUseQrPremium', (select plan_code in ('pro', 'enterprise') from active_sub),
      'canExportReports', (select enables_reports from active_sub),
      'canUseFinance', (select enables_finance from active_sub),
      'canAccessMultiFleet', (select plan_code = 'enterprise' from active_sub),
      'maxVehicles', (select max_vehicles from active_sub),
      'vehicleCount', (select n from vcnt),
      'isActive', true
    )
  end;
$$;

create or replace function public.list_fleet_subscriptions(p_fleet_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_check jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  v_check := public.rbac_check_permission('billing.view', p_fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_abonnement';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'starts_at' desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', a.id,
      'fleet_id', a.fleet_id,
      'fleet_name', f.name,
      'plan_id', p.id,
      'plan_code', p.code,
      'plan_name', p.name,
      'status', a.status,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'cancelled_at', a.cancelled_at,
      'vehicle_capacity', (public.subscription_plan_capacity(p.code, p.max_vehicles, coalesce(a.vehicle_slots, p.max_vehicles_per_subscription))->>'vehicles_per_subscription')::int,
      'vehicle_count', count(dv.id)::int,
      'available_slots', public.get_subscription_available_slots(a.id),
      'vehicles', coalesce(jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'fleet_id', v.fleet_id,
          'registration', v.registration,
          'status', v.status,
          'fleet_name', f.name,
          'associated_at', dv.associated_at
        )
        order by dv.associated_at desc
      ) filter (where v.id is not null), '[]'::jsonb)
    ) as row_data
    from public.abonnements a
    join public.flottes f on f.id = a.fleet_id
    join public.plans p on p.id = a.plan_id
    left join public.droits_vehicules dv on dv.subscription_id = a.id and dv.active = true
    left join public.vehicules v on v.id = dv.vehicle_id
    where a.fleet_id = p_fleet_id
    group by a.id, f.name, p.id, p.code, p.name, p.max_vehicles, p.max_vehicles_per_subscription
  ) rows;

  return v_result;
end;
$$;

create or replace function public.get_subscription_detail(p_subscription_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_fleet_id uuid;
begin
  select fleet_id into v_fleet_id
  from public.abonnements
  where id = p_subscription_id;

  if v_fleet_id is null then
    raise exception 'abonnement_introuvable';
  end if;

  return (
    select item
    from jsonb_array_elements(public.list_fleet_subscriptions(v_fleet_id)) item
    where item->>'id' = p_subscription_id::text
    limit 1
  );
end;
$$;

create or replace function public.get_vehicles_by_subscription(p_subscription_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_check jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select fleet_id into v_fleet_id
  from public.abonnements
  where id = p_subscription_id;

  if v_fleet_id is null then
    raise exception 'abonnement_introuvable';
  end if;

  v_check := public.rbac_check_permission('vehicle.read_by_subscription', v_fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_vehicle_read_by_subscription';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'subscription_id', a.id,
    'fleet_id', a.fleet_id,
    'fleet_name', f.name,
    'vehicle_id', v.id,
    'registration', v.registration,
    'status', v.status,
    'associated_at', dv.associated_at
  ) order by dv.associated_at desc), '[]'::jsonb)
  into v_result
  from public.abonnements a
  join public.flottes f on f.id = a.fleet_id
  join public.droits_vehicules dv on dv.subscription_id = a.id and dv.active = true
  join public.vehicules v on v.id = dv.vehicle_id and v.fleet_id = a.fleet_id
  where a.id = p_subscription_id
    and a.fleet_id = v_fleet_id;

  return v_result;
end;
$$;

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

create or replace function public.terminate_subscription_early(p_subscription_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_check jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select id, fleet_id, status
  into v_sub
  from public.abonnements
  where id = p_subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  v_check := public.rbac_check_permission('billing.manage', v_sub.fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_abonnement';
  end if;

  if v_sub.status in ('cancelled', 'expired') then
    return jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', v_sub.status);
  end if;

  update public.abonnements
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      ends_at = least(ends_at, now())
  where id = p_subscription_id;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      v_sub.fleet_id,
      p_subscription_id,
      'subscription.terminated_early',
      jsonb_build_object('actor_id', auth.uid(), 'previous_status', v_sub.status)
    );
  end if;

  return jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', 'cancelled');
end;
$$;

create or replace function public.archive_unsubscribed_vehicles_after_one_year()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived int;
begin
  update public.vehicules v
  set archived_at = now(),
      status = 'blocked',
      blocked_reason = coalesce(v.blocked_reason, 'Archive automatique: aucun abonnement valide depuis un an')
  where v.archived_at is null
    and not exists (
      select 1
      from public.droits_vehicules dv
      join public.abonnements a on a.id = dv.subscription_id
      where dv.vehicle_id = v.id
        and dv.active = true
        and public.is_vehicle_subscription_status_active(a.status)
    )
    and coalesce(
      (
        select max(coalesce(dv.ended_at, dv.associated_at))
        from public.droits_vehicules dv
        where dv.vehicle_id = v.id
      ),
      v.created_at
    ) < now() - interval '1 year';

  get diagnostics v_archived = row_count;

  return jsonb_build_object('archived_vehicles', v_archived, 'timestamp', now());
end;
$$;

create or replace function public.rbac_check_permission(
  p_action text,
  p_fleet_id uuid default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
  v_allowed boolean := false;
  v_is_admin boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('allowed', false, 'role', null, 'reason', 'session_expired');
  end if;

  if to_regclass('public.admin_profiles') is not null then
    execute
      'select exists (
         select 1
         from public.admin_profiles
         where user_id = $1 and is_active = true
       )'
      into v_is_admin
      using auth.uid();
  end if;

  if v_is_admin then
    return jsonb_build_object('allowed', true, 'role', 'admin', 'reason', 'platform_admin');
  end if;

  if p_fleet_id is not null then
    select role::text
    into v_role
    from public.flotte_adhesions
    where user_id = auth.uid()
      and fleet_id = p_fleet_id
      and is_active = true
    order by created_at desc
    limit 1;
  else
    select role::text
    into v_role
    from public.flotte_adhesions
    where user_id = auth.uid()
      and is_active = true
    order by case role::text
      when 'organizer' then 1
      when 'manager' then 2
      when 'mechanic' then 3
      when 'driver' then 4
      else 5
    end
    limit 1;
  end if;

  if v_role is null then
    return jsonb_build_object('allowed', false, 'role', null, 'reason', 'no_fleet_access');
  end if;

  v_allowed := case
    when p_action = 'fleet.view' then v_role in ('organizer', 'manager', 'driver', 'mechanic')
    when p_action = 'fleet.create' then v_role = 'organizer'
    when p_action = 'fleet.update' then v_role in ('organizer', 'manager')
    when p_action = 'fleet.delete' then v_role = 'organizer'
    when p_action = 'vehicle.view' then v_role in ('organizer', 'manager', 'driver', 'mechanic')
    when p_action = 'vehicle.read_by_subscription' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'vehicle.create' then v_role in ('organizer', 'manager')
    when p_action = 'vehicle.update' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'vehicle.delete' then v_role in ('organizer', 'manager')
    when p_action = 'vehicle.assign_driver' then v_role in ('organizer', 'manager')
    when p_action = 'member.view' then v_role in ('organizer', 'manager', 'mechanic', 'driver')
    when p_action = 'member.invite' then v_role in ('organizer', 'manager')
    when p_action = 'member.remove' then v_role = 'organizer'
    when p_action = 'member.update_role' then v_role = 'organizer'
    when p_action = 'maintenance.view' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'maintenance.create' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'maintenance.update' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'maintenance.delete' then v_role in ('organizer', 'manager')
    when p_action = 'assignment.view_own' then v_role in ('organizer', 'manager', 'driver', 'mechanic')
    when p_action = 'assignment.view_all' then v_role in ('organizer', 'manager')
    when p_action = 'assignment.manage' then v_role in ('organizer', 'manager')
    when p_action = 'report.view' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'report.export' then v_role in ('organizer', 'manager')
    when p_action = 'billing.view' then v_role in ('organizer', 'manager')
    when p_action = 'billing.manage' then v_role = 'organizer'
    when p_action = 'dvir.submit' then v_role in ('organizer', 'manager', 'driver', 'mechanic')
    when p_action = 'dvir.view_all' then v_role in ('organizer', 'manager', 'mechanic')
    when p_action = 'org.settings' then v_role in ('organizer', 'manager')
    when p_action = 'org.manage' then v_role = 'organizer'
    when p_action in ('admin.access', 'admin.manage_users', 'admin.manage_all_fleets') then false
    else false
  end;

  return jsonb_build_object(
    'allowed', v_allowed,
    'role', v_role,
    'reason', case when v_allowed then 'role_allowed' else 'role_denied' end
  );
end;
$$;

grant execute on function public.subscription_plan_capacity(text, integer, integer) to authenticated, service_role;
grant execute on function public.get_subscription_available_slots(uuid) to authenticated, service_role;
grant execute on function public.can_create_vehicle(uuid) to authenticated, service_role;
grant execute on function public.get_plan_access(uuid) to authenticated, service_role;
grant execute on function public.list_fleet_subscriptions(uuid) to authenticated;
grant execute on function public.get_subscription_detail(uuid) to authenticated;
grant execute on function public.get_vehicles_by_subscription(uuid) to authenticated;
revoke execute on function public.admin_list_subscription_grant_options() from public;
revoke execute on function public.admin_list_subscription_grant_options() from anon;
grant execute on function public.admin_list_subscription_grant_options() to authenticated;
revoke execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) from public;
revoke execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) from anon;
grant execute on function public.admin_create_fleet_subscription(uuid, text, timestamptz, boolean, boolean, integer, text) to authenticated;
grant execute on function public.transfer_vehicle_subscription(uuid, uuid) to authenticated;
grant execute on function public.terminate_subscription_early(uuid) to authenticated;
grant execute on function public.archive_unsubscribed_vehicles_after_one_year() to service_role;
grant execute on function public.rbac_check_permission(text, uuid) to authenticated;

revoke execute on function public.assign_vehicle_to_subscription(uuid, uuid, uuid) from anon, authenticated;
grant execute on function public.assign_vehicle_to_subscription(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
