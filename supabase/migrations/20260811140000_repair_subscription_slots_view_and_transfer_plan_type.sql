-- Repair subscription slot display and keep vehicle transfers inside the same plan type.

do $$
begin
  if to_regclass('public.billing_events') is not null then
    update public.abonnements a
    set vehicle_slots = greatest(1, (e.payload->>'vehicle_slots')::int)
    from public.billing_events e
    where e.subscription_id = a.id
      and e.event_type = 'subscription.admin_created'
      and e.payload ? 'vehicle_slots'
      and (e.payload->>'vehicle_slots') ~ '^[0-9]+$'
      and a.vehicle_slots is distinct from greatest(1, (e.payload->>'vehicle_slots')::int);
  end if;
end $$;

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
        a.vehicle_slots
    ) row_source
  ) rows;

  return v_result;
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
  v_source_plan_code text;
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

  select a.id, a.fleet_id, a.status, p.code as plan_code
  into v_target
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.id = p_target_subscription_id
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

  select dv.subscription_id, p.code
  into v_old_subscription_id, v_source_plan_code
  from public.droits_vehicules dv
  join public.abonnements a on a.id = dv.subscription_id
  join public.plans p on p.id = a.plan_id
  where dv.vehicle_id = p_vehicle_id
    and dv.active = true
  for update;

  if v_old_subscription_id = p_target_subscription_id then
    return jsonb_build_object('ok', true, 'vehicle_id', p_vehicle_id, 'subscription_id', p_target_subscription_id);
  end if;

  if v_source_plan_code is not null and v_source_plan_code is distinct from v_target.plan_code then
    raise exception 'abonnement_type_incompatible'
      using hint = 'Un vehicule ne peut etre transfere que vers un abonnement du meme plan.';
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
    'subscription_id', p_target_subscription_id,
    'previous_subscription_id', v_old_subscription_id
  );
end;
$$;

grant execute on function public.list_fleet_subscriptions(uuid) to authenticated;
grant execute on function public.transfer_vehicle_subscription(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
