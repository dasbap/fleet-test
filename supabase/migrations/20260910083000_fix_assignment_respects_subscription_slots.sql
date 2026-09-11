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

  select a.id, a.fleet_id, a.status, a.vehicle_slots,
         p.code as plan_code, p.max_vehicles, p.max_vehicles_per_subscription
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