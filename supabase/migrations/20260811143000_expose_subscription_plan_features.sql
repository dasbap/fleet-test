-- Expose plan feature flags on subscription rows so vehicle-scoped UI guards
-- can use the features of the subscription attached to each vehicle.

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
      'id', row_source.id,
      'fleet_id', row_source.fleet_id,
      'fleet_name', row_source.fleet_name,
      'plan_id', row_source.plan_id,
      'plan_code', row_source.plan_code,
      'plan_name', row_source.plan_name,
      'status', row_source.status,
      'starts_at', row_source.starts_at,
      'ends_at', row_source.ends_at,
      'cancelled_at', row_source.cancelled_at,
      'vehicle_slots', row_source.vehicle_slots,
      'vehicle_capacity', row_source.vehicle_capacity,
      'vehicle_count', row_source.vehicle_count,
      'available_slots', greatest(0, row_source.vehicle_capacity - row_source.vehicle_count),
      'available_slots_label', greatest(0, row_source.vehicle_capacity - row_source.vehicle_count)::text || ' / ' || row_source.vehicle_capacity::text,
      'finance_enabled', row_source.finance_enabled,
      'ai_enabled', row_source.ai_enabled,
      'reports_enabled', row_source.reports_enabled,
      'driver_scoring_enabled', row_source.driver_scoring_enabled,
      'anomaly_insights_enabled', row_source.anomaly_insights_enabled,
      'geofencing_enabled', row_source.geofencing_enabled,
      'scheduled_reports_enabled', row_source.scheduled_reports_enabled,
      'offline_driver_enabled', row_source.offline_driver_enabled,
      'vehicles', row_source.vehicles
    ) as row_data
    from (
      select
        a.id,
        a.fleet_id,
        f.name as fleet_name,
        p.id as plan_id,
        p.code as plan_code,
        p.name as plan_name,
        a.status,
        a.starts_at,
        a.ends_at,
        a.cancelled_at,
        a.vehicle_slots,
        coalesce(
          a.vehicle_slots,
          (public.subscription_plan_capacity(
            p.code,
            p.max_vehicles,
            p.max_vehicles_per_subscription
          )->>'vehicles_per_subscription')::int
        ) as vehicle_capacity,
        count(dv.id)::int as vehicle_count,
        coalesce(p.enables_finance, false) as finance_enabled,
        coalesce(p.enables_ai, false) as ai_enabled,
        coalesce(p.enables_reports, false) as reports_enabled,
        coalesce(p.enables_driver_scoring, false) as driver_scoring_enabled,
        coalesce(p.enables_anomaly_insights, false) as anomaly_insights_enabled,
        coalesce(p.enables_geofencing, false) as geofencing_enabled,
        coalesce(p.enables_scheduled_reports, false) as scheduled_reports_enabled,
        coalesce(p.enables_offline_driver, false) as offline_driver_enabled,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'fleet_id', v.fleet_id,
            'registration', v.registration,
            'status', v.status,
            'fleet_name', f.name,
            'associated_at', dv.associated_at
          )
          order by dv.associated_at desc
        ) filter (where v.id is not null), '[]'::jsonb) as vehicles
      from public.abonnements a
      join public.flottes f on f.id = a.fleet_id
      join public.plans p on p.id = a.plan_id
      left join public.droits_vehicules dv on dv.subscription_id = a.id and dv.active = true
      left join public.vehicules v on v.id = dv.vehicle_id
      where a.fleet_id = p_fleet_id
      group by
        a.id,
        f.name,
        p.id,
        p.code,
        p.name,
        p.max_vehicles,
        p.max_vehicles_per_subscription,
        p.enables_finance,
        p.enables_ai,
        p.enables_reports,
        p.enables_driver_scoring,
        p.enables_anomaly_insights,
        p.enables_geofencing,
        p.enables_scheduled_reports,
        p.enables_offline_driver,
        a.vehicle_slots
    ) row_source
  ) rows;

  return v_result;
end;
$$;

grant execute on function public.list_fleet_subscriptions(uuid) to authenticated;

notify pgrst, 'reload schema';
