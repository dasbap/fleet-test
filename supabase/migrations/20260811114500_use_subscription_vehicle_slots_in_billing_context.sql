-- Use granted subscription vehicle slots as the fleet vehicle limit shown to
-- organizers. The Pro catalog can allow up to 100 vehicles, but a fleet only
-- gets the number of licenses granted on its active subscriptions.

begin;

create or replace function public.get_fleet_billing_context(p_fleet_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base            jsonb;
  v_vehicle_count   int;
  v_active_vehicles int;
  v_license_count   int;
  v_sub_id          uuid;
  v_sub_status      text;
  v_plan_code       text;
  v_plan_name       text;
  v_max_vehicles    int;
  v_subscription_slots int;
  v_vehicle_slots   int;
  v_is_paid         boolean;
  v_billing_status  text;
  v_trial_ends_at   timestamptz;
  v_sub_ends_at     timestamptz;
  v_grace_until     timestamptz;
  v_finance         boolean;
  v_ai              boolean;
  v_reports         boolean;
  v_scoring         boolean;
  v_anomaly         boolean;
  v_geofencing      boolean;
  v_scheduled       boolean;
  v_offline         boolean;
begin
  if auth.uid() is null then
    raise exception 'Non authentifie';
  end if;

  if not (
    public.has_role(p_fleet_id, 'organizer'::role_type)
    or public.has_role(p_fleet_id, 'manager'::role_type)
    or public.has_role(p_fleet_id, 'mechanic'::role_type)
    or public.has_role(p_fleet_id, 'driver'::role_type)
  ) then
    raise exception 'Acces refuse pour cette flotte';
  end if;

  v_base := public.get_fleet_billing_context_internal(p_fleet_id);

  v_vehicle_count   := (v_base->>'vehicle_count')::int;
  v_active_vehicles := (v_base->>'active_vehicles')::int;
  v_plan_code       := v_base->>'plan_code';
  v_max_vehicles    := (v_base->>'max_vehicles')::int;

  select
    a.id,
    a.status,
    p.code,
    p.name,
    p.max_vehicles,
    a.vehicle_slots,
    p.enables_finance,
    p.enables_ai,
    p.enables_reports,
    p.enables_driver_scoring,
    p.enables_anomaly_insights,
    p.enables_geofencing,
    p.enables_scheduled_reports,
    p.enables_offline_driver,
    a.trial_ends_at,
    a.ends_at,
    a.grace_until
  into
    v_sub_id,
    v_sub_status,
    v_plan_code,
    v_plan_name,
    v_max_vehicles,
    v_subscription_slots,
    v_finance,
    v_ai,
    v_reports,
    v_scoring,
    v_anomaly,
    v_geofencing,
    v_scheduled,
    v_offline,
    v_trial_ends_at,
    v_sub_ends_at,
    v_grace_until
  from public.abonnements a
  inner join public.plans p on p.id = a.plan_id
  where a.fleet_id = p_fleet_id
    and a.status in ('trial', 'active', 'grace_period', 'suspended', 'pending_payment')
    and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
  order by a.ends_at desc nulls last, a.starts_at desc, a.id desc
  limit 1;

  if v_plan_code is null then
    select
      pf.name,
      pf.max_vehicles,
      pf.enables_finance,
      pf.enables_ai,
      pf.enables_reports,
      pf.enables_driver_scoring,
      pf.enables_anomaly_insights,
      pf.enables_geofencing,
      pf.enables_scheduled_reports,
      pf.enables_offline_driver
    into
      v_plan_name,
      v_max_vehicles,
      v_finance,
      v_ai,
      v_reports,
      v_scoring,
      v_anomaly,
      v_geofencing,
      v_scheduled,
      v_offline
    from public.plans pf
    where pf.code = 'free'
    limit 1;

    v_plan_code      := 'free';
    v_is_paid        := false;
    v_billing_status := 'trial';
    v_sub_status     := null;
    v_sub_id         := null;
    v_trial_ends_at  := null;
    v_sub_ends_at    := null;
    v_grace_until    := null;
    v_vehicle_slots  := coalesce(v_max_vehicles, 3);
  else
    v_is_paid := v_plan_code <> 'free';

    if v_plan_code = 'free' then
      v_max_vehicles := coalesce(v_max_vehicles, 3);
      v_finance      := false;
      v_ai           := false;
      v_reports      := false;
      v_scoring      := false;
      v_anomaly      := false;
      v_geofencing   := false;
      v_scheduled    := false;
      v_offline      := coalesce(v_offline, false);
    else
      v_finance    := coalesce(v_finance, true);
      v_ai         := coalesce(v_ai, true);
      v_reports    := coalesce(v_reports, true);
      v_scoring    := coalesce(v_scoring, true);
      v_anomaly    := coalesce(v_anomaly, true);
      v_geofencing := coalesce(v_geofencing, false);
      v_scheduled  := coalesce(v_scheduled, false);
      v_offline    := coalesce(v_offline, true);
    end if;

    select coalesce(sum(
      (public.subscription_plan_capacity(
        p.code,
        p.max_vehicles,
        coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
      )->>'vehicles_per_subscription')::int
    ), 0)
    into v_vehicle_slots
    from public.abonnements a
    inner join public.plans p on p.id = a.plan_id
    where a.fleet_id = p_fleet_id
      and a.status in ('trial', 'active', 'grace_period', 'pending_payment')
      and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now();

    v_vehicle_slots := coalesce(nullif(v_vehicle_slots, 0), v_subscription_slots, v_max_vehicles, 3);

    v_billing_status := case
      when v_plan_code = 'enterprise'
        and v_sub_status in ('active', 'trial', 'grace_period')
        then 'enterprise'
      when v_sub_status = 'grace_period' then 'grace'
      when v_sub_status = 'suspended' then 'suspended'
      when v_sub_status = 'trial' then 'trial'
      when v_sub_status = 'pending_payment' then 'trial'
      when v_sub_status = 'active' then 'active'
      else 'trial'
    end;
  end if;

  v_license_count := 0;
  if v_sub_id is not null then
    select count(*)::int
    into v_license_count
    from public.droits_vehicules dv
    where dv.subscription_id = v_sub_id
      and dv.active = true;
  end if;

  return jsonb_build_object(
    'plan_code',                    v_plan_code,
    'plan_name',                    coalesce(v_plan_name, v_plan_code),
    'is_paid',                      v_is_paid,
    'vehicle_count',                v_vehicle_count,
    'active_vehicles',              v_active_vehicles,
    'vehicle_slots',                coalesce(v_vehicle_slots, 999999),
    'max_vehicles',                 coalesce(v_vehicle_slots, v_max_vehicles, 999999),
    'billing_status',               v_billing_status,
    'trial_ends_at',                v_trial_ends_at,
    'subscription_ends_at',         v_sub_ends_at,
    'grace_until',                  v_grace_until,
    'finance_enabled',              v_finance,
    'ai_enabled',                   v_ai,
    'reports_enabled',              v_reports,
    'driver_scoring_enabled',       v_scoring,
    'anomaly_insights_enabled',     v_anomaly,
    'geofencing_enabled',           v_geofencing,
    'scheduled_reports_enabled',    v_scheduled,
    'offline_driver_enabled',       v_offline
  );
end;
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
      a.vehicle_slots,
      p.max_vehicles_per_subscription,
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
      and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
    order by a.ends_at desc nulls last, a.starts_at desc, a.id desc
    limit 1
  ),
  total_slots as (
    select coalesce(sum(
      (public.subscription_plan_capacity(
        p.code,
        p.max_vehicles,
        coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
      )->>'vehicles_per_subscription')::int
    ), 0) as n
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
    where a.fleet_id = p_fleet_id
      and public.is_vehicle_subscription_status_active(a.status)
      and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
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
      'maxVehicles', coalesce(nullif((select n from total_slots), 0), 3),
      'vehicleCount', (select n from vcnt),
      'isActive', true
    )
  end;
$$;

grant execute on function public.get_fleet_billing_context(uuid) to authenticated;
grant execute on function public.get_plan_access(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
