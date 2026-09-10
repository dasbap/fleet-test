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
  if current_setting('app.admin_vehicle_bypass', true) = 'on'
     and public.is_platform_admin() then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.fleet_id::text, 2026081012));

  select coalesce(sum((public.subscription_plan_capacity(
    p.code,
    p.max_vehicles,
    coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
  )->>'vehicles_per_subscription')::int), 0)
  into v_slots
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.fleet_id = new.fleet_id
    and public.is_vehicle_subscription_status_active(a.status)
    and coalesce(a.starts_at, '-infinity'::timestamptz) <= now()
    and coalesce(a.ends_at, 'infinity'::timestamptz) > now();

  select count(*)::int
  into v_used
  from public.droits_vehicules dv
  join public.abonnements a on a.id = dv.subscription_id
  where a.fleet_id = new.fleet_id
    and dv.active = true
    and public.is_vehicle_subscription_status_active(a.status)
    and coalesce(a.starts_at, '-infinity'::timestamptz) <= now()
    and coalesce(a.ends_at, 'infinity'::timestamptz) > now();

  if v_slots <= 0 or v_used + 1 > v_slots then
    raise exception 'limite_vehicules_abonnements_atteinte'
      using hint = 'Vous avez atteint la limite de vehicules autorisee par vos abonnements.';
  end if;

  return new;
end;
$$;