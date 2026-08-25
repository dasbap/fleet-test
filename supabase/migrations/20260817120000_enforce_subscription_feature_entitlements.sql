-- Enforce premium feature entitlements at the database boundary.
-- UI guards remain useful for UX, but they are not the source of truth.

begin;

create or replace function public.fleet_feature_enabled(
  p_fleet_id uuid,
  p_feature text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
    where a.fleet_id = p_fleet_id
      and a.status in ('trial', 'active')
      and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
      and case lower(trim(p_feature))
        when 'finance' then coalesce(p.enables_finance, false)
        when 'reports' then coalesce(p.enables_reports, false)
        when 'driver_scoring' then coalesce(p.enables_driver_scoring, false)
        when 'ai' then coalesce(p.enables_ai, false) or coalesce(p.enables_anomaly_insights, false)
        when 'anomaly_insights' then coalesce(p.enables_anomaly_insights, false)
        when 'geofencing' then coalesce(p.enables_geofencing, false)
        when 'scheduled_reports' then coalesce(p.enables_scheduled_reports, false)
        when 'offline_driver' then coalesce(p.enables_offline_driver, false)
        else false
      end
  );
$$;

create or replace function public.trg_require_fleet_feature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_feature text;
begin
  v_feature := TG_ARGV[0];
  v_fleet_id := (to_jsonb(new)->>'fleet_id')::uuid;

  if v_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if not public.fleet_feature_enabled(v_fleet_id, v_feature) then
    raise exception 'feature_not_in_subscription:%', v_feature
      using hint = 'Cette fonctionnalite n''est pas incluse dans l''abonnement actif.';
  end if;

  return new;
end;
$$;

create or replace function public.predict_failure_risk(
  p_fleet_id uuid,
  p_vehicle_id uuid default null
)
returns table (
  vehicle_id uuid,
  risk_score int,
  risk_level text,
  top_signals jsonb,
  recommended_actions jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_score int;
  v_level text;
  v_signals text[];
  v_actions text[];
begin
  if auth.uid() is null then
    raise exception 'authentification_requise'
      using errcode = 'P0001';
  end if;

  if p_fleet_id is null then
    raise exception 'fleet_id_requis'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.flotte_adhesions fa
    where fa.fleet_id = p_fleet_id
      and fa.user_id = auth.uid()
      and fa.is_active = true
  ) then
    raise exception 'acces_flotte_refuse'
      using errcode = 'P0001';
  end if;

  if not public.fleet_feature_enabled(p_fleet_id, 'ai') then
    raise exception 'feature_not_in_subscription:ai'
      using hint = 'Pulse+ est reserve aux plans qui incluent l''IA.';
  end if;

  for v_row in
    select *
    from public.vehicle_failure_features_v1 vf
    where vf.fleet_id = p_fleet_id
      and (p_vehicle_id is null or vf.vehicle_id = p_vehicle_id)
  loop
    v_score := least(
      100,
      (v_row.critical_incident_count_30d * 20)
      + (v_row.incident_count_30d * 8)
      + (v_row.open_maintenance_jobs * 12)
      + (v_row.fuel_anomaly_events_30d * 10)
      + case when v_row.vehicle_status = 'blocked' then 25 else 0 end
    );

    v_signals := array[
      case when v_row.critical_incident_count_30d > 0 then format('%s incident(s) critique(s) sur 30 jours', v_row.critical_incident_count_30d) end,
      case when v_row.incident_count_30d >= 3 then format('%s incidents signales sur 30 jours', v_row.incident_count_30d) end,
      case when v_row.open_maintenance_jobs > 0 then format('%s entretien(s) non cloture(s)', v_row.open_maintenance_jobs) end,
      case when v_row.fuel_anomaly_events_30d > 0 then format('%s anomalie(s) carburant detectee(s)', v_row.fuel_anomaly_events_30d) end,
      case when v_row.vehicle_status = 'blocked' then 'Vehicule actuellement bloque' end
    ];

    v_actions := array[
      case when v_row.open_maintenance_jobs > 0 then 'Prioriser la cloture des entretiens en cours dans les 24h.' end,
      case when v_row.fuel_anomaly_events_30d > 0 then 'Controler le circuit carburant et verifier les tickets de ravitaillement.' end,
      case when v_row.critical_incident_count_30d > 0 then 'Planifier une inspection mecanique approfondie avant la prochaine rotation.' end,
      case when v_row.incident_count_30d = 0 and v_row.fuel_anomaly_events_30d = 0 then 'Maintenir le rythme de maintenance preventive actuel.' end
    ];

    if v_score >= 85 then
      v_level := 'critical';
    elsif v_score >= 70 then
      v_level := 'high';
    elsif v_score >= 40 then
      v_level := 'medium';
    else
      v_level := 'low';
    end if;

    insert into public.failure_predictions (
      fleet_id,
      vehicle_id,
      risk_score,
      risk_level,
      top_signals,
      recommended_actions
    )
    values (
      p_fleet_id,
      v_row.vehicle_id,
      v_score,
      v_level,
      to_jsonb(array_remove(v_signals, null)),
      to_jsonb(array_remove(v_actions, null))
    );

    vehicle_id := v_row.vehicle_id;
    risk_score := v_score;
    risk_level := v_level;
    top_signals := to_jsonb(array_remove(v_signals, null));
    recommended_actions := to_jsonb(array_remove(v_actions, null));
    return next;
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    drop trigger if exists trg_vehicle_costs_require_finance on public.vehicle_costs;
    create trigger trg_vehicle_costs_require_finance
      before insert or update on public.vehicle_costs
      for each row
      execute function public.trg_require_fleet_feature('finance');

    drop policy if exists vehicle_costs_feature_finance_select on public.vehicle_costs;
    create policy vehicle_costs_feature_finance_select
      on public.vehicle_costs
      as restrictive
      for select
      to authenticated
      using (public.fleet_feature_enabled(fleet_id, 'finance'));
  end if;

  if to_regclass('public.scheduled_reports') is not null then
    drop trigger if exists trg_scheduled_reports_require_feature on public.scheduled_reports;
    create trigger trg_scheduled_reports_require_feature
      before insert or update on public.scheduled_reports
      for each row
      execute function public.trg_require_fleet_feature('scheduled_reports');

    drop policy if exists scheduled_reports_feature_select on public.scheduled_reports;
    create policy scheduled_reports_feature_select
      on public.scheduled_reports
      as restrictive
      for select
      to authenticated
      using (public.fleet_feature_enabled(fleet_id, 'scheduled_reports'));
  end if;

  if to_regclass('public.geofences') is not null then
    drop trigger if exists trg_geofences_require_feature on public.geofences;
    create trigger trg_geofences_require_feature
      before insert or update on public.geofences
      for each row
      execute function public.trg_require_fleet_feature('geofencing');

    drop policy if exists geofences_feature_select on public.geofences;
    create policy geofences_feature_select
      on public.geofences
      as restrictive
      for select
      to authenticated
      using (public.fleet_feature_enabled(fleet_id, 'geofencing'));
  end if;

  if to_regclass('public.gps_devices') is not null then
    drop trigger if exists trg_gps_devices_require_feature on public.gps_devices;
    create trigger trg_gps_devices_require_feature
      before insert or update on public.gps_devices
      for each row
      execute function public.trg_require_fleet_feature('geofencing');

    drop policy if exists gps_devices_feature_select on public.gps_devices;
    create policy gps_devices_feature_select
      on public.gps_devices
      as restrictive
      for select
      to authenticated
      using (public.fleet_feature_enabled(fleet_id, 'geofencing'));
  end if;
end $$;

revoke execute on function public.fleet_feature_enabled(uuid, text) from public, anon;
grant execute on function public.fleet_feature_enabled(uuid, text) to authenticated, service_role;
grant execute on function public.trg_require_fleet_feature() to service_role;
grant execute on function public.predict_failure_risk(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
