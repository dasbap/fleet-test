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
  select
    (
      auth.role() = 'service_role'
      or exists (
        select 1
        from public.flotte_adhesions fa
        where fa.fleet_id = p_fleet_id
          and fa.user_id = auth.uid()
          and fa.is_active = true
      )
    )
    and exists (
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

revoke execute on function public.fleet_feature_enabled(uuid, text) from public, anon;
grant execute on function public.fleet_feature_enabled(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
